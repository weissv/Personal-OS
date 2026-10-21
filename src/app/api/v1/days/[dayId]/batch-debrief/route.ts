import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus, SlotType } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dayId: string }> }
) {
  try {
    const { dayId } = await params;
    const body = await req.json();
    const { updatedSlots = [], newCustomEvents = [] } = body;

    const day = await prisma.day.findUnique({
      where: { id: dayId },
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    // Execute batch debrief in an atomic Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update existing slots
      const slotUpdates = [];
      for (const slot of updatedSlots) {
        if (!slot.id) continue;
        const updateData: {
          status?: SlotStatus;
          deliverable?: string;
          taskGoal?: string;
          isGhost?: boolean;
        } = {};

        if (slot.status) updateData.status = slot.status as SlotStatus;
        if (slot.deliverable !== undefined) updateData.deliverable = slot.deliverable;
        if (slot.taskGoal !== undefined) updateData.taskGoal = slot.taskGoal;
        // If debriefing, it's confirmed, not ghost
        updateData.isGhost = false;

        const updated = await tx.daySlot.update({
          where: { id: slot.id },
          data: updateData,
        });
        slotUpdates.push(updated);
      }

      // 2. Insert new custom events
      const createdCustomEvents = [];
      for (let i = 0; i < newCustomEvents.length; i++) {
        const ev = newCustomEvents[i];
        const created = await tx.daySlot.create({
          data: {
            dayId,
            title: ev.title || 'Событие дня',
            startTime: ev.startTime || null,
            endTime: ev.endTime || null,
            taskGoal: ev.taskGoal || null,
            deliverable: ev.deliverable || null,
            status: (ev.status as SlotStatus) || SlotStatus.DONE,
            type: SlotType.CUSTOM_EVENT,
            isGhost: false,
            orderIndex: 100 + i,
          },
        });
        createdCustomEvents.push(created);
      }

      // 3. Return full updated day
      const updatedDay = await tx.day.findUnique({
        where: { id: dayId },
        include: {
          slots: {
            orderBy: [{ orderIndex: 'asc' }, { startTime: 'asc' }],
          },
        },
      });

      return {
        updatedSlotsCount: slotUpdates.length,
        createdEventsCount: createdCustomEvents.length,
        day: updatedDay,
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Вечерний дебрифинг успешно синхронизирован!',
    });
  } catch (error) {
    console.error('Batch debrief error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch debrief', details: String(error) },
      { status: 500 }
    );
  }
}
