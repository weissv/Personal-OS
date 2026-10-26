import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForSlot } from '@/lib/auth';
import { cleanSlotStatus, cleanText } from '@/lib/validation';
import { validateSlotTransition } from '@/lib/slot-state-machine';
import { parseDateOnly } from '@/lib/sprint';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const { slotId } = await params;
    const studentId = await studentIdForSlot(slotId);
    if (!studentId) return notFoundResponse('Слот не найден');

    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) {
      return denyResponse();
    }

    const body = await req.json().catch(() => ({}));
    const targetStatus = cleanSlotStatus(body.status);
    if (!targetStatus) {
      return NextResponse.json(
        { error: 'Неверный статус слота. Допустимые: PENDING, DONE, MIGRATED, DROPPED' },
        { status: 400 }
      );
    }

    const slot = await prisma.daySlot.findUnique({
      where: { id: slotId },
      include: { day: true },
    });

    if (!slot) {
      return notFoundResponse('Слот не найден');
    }

    // Poka-Yoke state machine validation
    const transitionCheck = validateSlotTransition(slot.status, targetStatus);
    if (!transitionCheck.allowed) {
      return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
    }

    const cleanGoal = body.taskGoal !== undefined ? cleanText(body.taskGoal, 1000) : slot.taskGoal;
    const cleanDoD = body.deliverable !== undefined ? cleanText(body.deliverable, 1000) : slot.deliverable;

    // Execute status transition and migration atomically
    const result = await prisma.$transaction(async (tx) => {
      let createdMigratedSlot = null;

      if (targetStatus === SlotStatus.MIGRATED && body.targetDate) {
        const parsedTarget = parseDateOnly(body.targetDate);
        if (parsedTarget) {
          const targetDay = await tx.day.findFirst({
            where: {
              weekId: slot.day.weekId,
              date: parsedTarget,
            },
          });

          if (targetDay) {
            createdMigratedSlot = await tx.daySlot.create({
              data: {
                dayId: targetDay.id,
                title: `[Перенесено] ${slot.title}`,
                type: slot.type,
                isGhost: false,
                taskGoal: cleanGoal,
                deliverable: cleanDoD,
                status: SlotStatus.PENDING,
                orderIndex: 200,
              },
            });
          }
        }
      }

      const updated = await tx.daySlot.update({
        where: { id: slotId },
        data: {
          status: targetStatus,
          isGhost: false,
          taskGoal: cleanGoal,
          deliverable: cleanDoD,
        },
      });

      return { updated, createdMigratedSlot };
    });

    return NextResponse.json({
      success: true,
      slot: result.updated,
      migratedSlot: result.createdMigratedSlot,
    });
  } catch (error) {
    console.error('Update slot status error:', error);
    return NextResponse.json({ error: 'Failed to update slot status' }, { status: 500 });
  }
}
