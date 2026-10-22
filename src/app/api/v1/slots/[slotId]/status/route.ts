import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForSlot } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const auth = await authenticate();
    if (!auth.ok) return auth.response;

    const { slotId } = await params;
    const studentId = await studentIdForSlot(slotId);
    if (!studentId) return notFoundResponse('Слот не найден');

    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) {
      return denyResponse();
    }

    const body = await req.json().catch(() => ({}));
    const { status, deliverable, taskGoal, targetDate } = body;

    const slot = await prisma.daySlot.findUnique({
      where: { id: slotId },
      include: { day: true },
    });

    if (!slot) {
      return notFoundResponse('Слот не найден');
    }

    // If migrating to another day (e.g., tomorrow or Saturday)
    if (status === 'MIGRATED' && targetDate) {
      const targetDay = await prisma.day.findFirst({
        where: {
          weekId: slot.day.weekId,
          date: new Date(targetDate),
        },
      });

      if (targetDay) {
        // Create migrated slot on target day
        await prisma.daySlot.create({
          data: {
            dayId: targetDay.id,
            title: `[Перенесено] ${slot.title}`,
            type: slot.type,
            isGhost: false,
            taskGoal: taskGoal || slot.taskGoal,
            deliverable: deliverable || slot.deliverable,
            status: SlotStatus.PENDING,
          },
        });
      }
    }

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        status: status as SlotStatus,
        isGhost: false,
        ...(deliverable !== undefined ? { deliverable } : {}),
        ...(taskGoal !== undefined ? { taskGoal } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      slot: updated,
    });
  } catch (error) {
    console.error('Update slot status error:', error);
    return NextResponse.json({ error: 'Failed to update slot status' }, { status: 500 });
  }
}
