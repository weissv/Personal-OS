import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotType, SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForDay } from '@/lib/auth';
import { cleanText, cleanTime, cleanSlotType } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { dayId, title, startTime, endTime, taskGoal, deliverable, type } = body;

    const cleanTitle = cleanText(title, 150, 1);
    if (!dayId || !cleanTitle) {
      return NextResponse.json({ error: 'dayId и title (от 1 до 150 символов) обязательны' }, { status: 400 });
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

    const targetType = cleanSlotType(type) || (type === 'SELF_STUDY' ? SlotType.SELF_STUDY : SlotType.CUSTOM_EVENT);

    const slot = await prisma.daySlot.create({
      data: {
        dayId,
        title: cleanTitle,
        startTime: cleanTime(startTime),
        endTime: cleanTime(endTime),
        taskGoal: cleanText(taskGoal, 1000),
        deliverable: cleanText(deliverable, 1000),
        type: targetType,
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
