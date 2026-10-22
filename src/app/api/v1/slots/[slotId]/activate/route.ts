import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForSlot } from '@/lib/auth';

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
    const { taskGoal, deliverable } = body;

    const slot = await prisma.daySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return notFoundResponse('Слот не найден');
    }

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        isGhost: false,
        taskGoal: taskGoal || slot.taskGoal,
        deliverable: deliverable || slot.deliverable,
      },
    });

    return NextResponse.json({
      success: true,
      slot: updated,
      message: 'Урок активирован как задача!',
    });
  } catch (error) {
    console.error('Activate slot error:', error);
    return NextResponse.json({ error: 'Failed to activate slot' }, { status: 500 });
  }
}
