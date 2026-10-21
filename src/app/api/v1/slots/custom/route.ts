import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotType, SlotStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dayId, title, startTime, endTime, taskGoal, deliverable, type } = body;

    if (!dayId || !title) {
      return NextResponse.json({ error: 'dayId and title are required' }, { status: 400 });
    }

    const day = await prisma.day.findUnique({
      where: { id: dayId },
    });

    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    const slot = await prisma.daySlot.create({
      data: {
        dayId,
        title,
        startTime: startTime || null,
        endTime: endTime || null,
        taskGoal: taskGoal || null,
        deliverable: deliverable || null,
        type: type === 'SELF_STUDY' ? SlotType.SELF_STUDY : SlotType.CUSTOM_EVENT,
        isGhost: false,
        status: SlotStatus.PENDING,
      },
    });

    return NextResponse.json({
      success: true,
      slot,
    });
  } catch (error) {
    console.error('Create custom slot error:', error);
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
  }
}
