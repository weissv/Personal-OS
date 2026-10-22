import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForSlot } from '@/lib/auth';

export async function PATCH(
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
    const { startTime, endTime, title, taskGoal, deliverable, status, isGhost } = body;

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(title !== undefined && { title }),
        ...(taskGoal !== undefined && { taskGoal }),
        ...(deliverable !== undefined && { deliverable }),
        ...(status !== undefined && { status: status as SlotStatus }),
        ...(isGhost !== undefined && { isGhost }),
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
    const auth = await authenticate();
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete slot error:', error);
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
