import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse, studentIdForSlot } from '@/lib/auth';
import { cleanText } from '@/lib/validation';

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
    const slot = await prisma.daySlot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return notFoundResponse('Слот не найден');
    }

    const taskGoal = body.taskGoal !== undefined ? cleanText(body.taskGoal, 1000) || null : slot.taskGoal;
    const deliverable = body.deliverable !== undefined ? cleanText(body.deliverable, 1000) || null : slot.deliverable;

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        isGhost: false,
        taskGoal,
        deliverable,
      },
    });

    return NextResponse.json({
      success: true,
      slot: updated,
      message: 'Урок активирован как задача!',
    });
  } catch (error) {
    return handleApiError('slots/activate', error, 'Не удалось активировать урок');
  }
}
