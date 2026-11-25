import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotType, SlotStatus } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse, studentIdForDay } from '@/lib/auth';
import { cleanText, cleanTime, cleanSlotType, timeToMinutes } from '@/lib/validation';

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

    // Ученик не может «нарисовать» себе урок из расписания: только событие или проектный блок
    const requested = cleanSlotType(type);
    const targetType = requested === SlotType.SELF_STUDY ? SlotType.SELF_STUDY : SlotType.CUSTOM_EVENT;

    const start = cleanTime(startTime);
    const end = cleanTime(endTime);
    if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
      return NextResponse.json({ error: 'Время окончания должно быть позже начала' }, { status: 400 });
    }

    const slot = await prisma.daySlot.create({
      data: {
        dayId,
        title: cleanTitle,
        startTime: start,
        endTime: end,
        taskGoal: cleanText(taskGoal, 1000) || null,
        deliverable: cleanText(deliverable, 1000) || null,
        type: targetType,
        isGhost: false,
        status: SlotStatus.PENDING,
        orderIndex: 100, // порядок в дне определяется временем; без времени — в конце
      },
    });

    return NextResponse.json({
      success: true,
      slot,
    });
  } catch (error) {
    return handleApiError('slots/custom', error, 'Не удалось создать событие');
  }
}
