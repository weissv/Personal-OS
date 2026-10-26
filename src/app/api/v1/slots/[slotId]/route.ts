import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForSlot } from '@/lib/auth';
import { cleanSlotStatus, cleanText, cleanTime } from '@/lib/validation';
import { validateSlotTransition } from '@/lib/slot-state-machine';

export async function PATCH(
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

    const slot = await prisma.daySlot.findUnique({ where: { id: slotId } });
    if (!slot) return notFoundResponse('Слот не найден');

    const body = await req.json().catch(() => ({}));
    const { startTime, endTime, title, taskGoal, deliverable, status, isGhost } = body;

    let targetStatus = undefined;
    if (status !== undefined) {
      targetStatus = cleanSlotStatus(status);
      if (!targetStatus) {
        return NextResponse.json({ error: 'Неверный статус слота' }, { status: 400 });
      }
      const transitionCheck = validateSlotTransition(slot.status, targetStatus);
      if (!transitionCheck.allowed) {
        return NextResponse.json({ error: transitionCheck.reason }, { status: 400 });
      }
    }

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        ...(startTime !== undefined && { startTime: cleanTime(startTime) }),
        ...(endTime !== undefined && { endTime: cleanTime(endTime) }),
        ...(title !== undefined && { title: cleanText(title, 150, 1) || slot.title }),
        ...(taskGoal !== undefined && { taskGoal: cleanText(taskGoal, 1000) }),
        ...(deliverable !== undefined && { deliverable: cleanText(deliverable, 1000) }),
        ...(targetStatus !== undefined && { status: targetStatus }),
        ...(isGhost !== undefined && { isGhost: Boolean(isGhost) }),
      },
    });

    return NextResponse.json({
      success: true,
      slot: updated,
    });
  } catch (error) {
    console.error('Update slot error:', error);
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }
}

export async function DELETE(
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

    await prisma.daySlot.delete({
      where: { id: slotId },
    });

    return NextResponse.json({
      success: true,
      message: 'Слот удален',
    });
  } catch (error) {
    console.error('Delete slot error:', error);
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
