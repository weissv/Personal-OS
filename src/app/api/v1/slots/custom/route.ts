import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotType, SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForDay } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { dayId, title, startTime, endTime, taskGoal, deliverable, type } = body;

    if (!dayId || !title) {
      return NextResponse.json({ error: 'dayId и title обязательны' }, { status: 400 });
    }

    const studentId = await studentIdForDay(dayId);
    if (!studentId) return notFoundResponse('День не найден');

    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) {
      return denyResponse();
    }

    const day = await prisma.day.findUnique({
      where: { id: dayId },
    });

    if (!day) {
      return notFoundResponse('День не найден');
    }

    const slot = await prisma.daySlot.create({
      data: {
        dayId,
        title: String(title).slice(0, 150),
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
