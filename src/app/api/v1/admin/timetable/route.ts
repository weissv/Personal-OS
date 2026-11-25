import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, badRequest, handleApiError } from '@/lib/auth';
import { cleanDayOfWeek, cleanGrade, cleanText, cleanTime, timeToMinutes } from '@/lib/validation';
import { audit, auditActor } from '@/lib/audit';

const DAY_SHORT = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// GET /api/v1/admin/timetable?grade=9
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const gradeLevel = cleanGrade(new URL(req.url).searchParams.get('grade'));
    const slots = await prisma.timetableSlot.findMany({
      where: gradeLevel ? { gradeLevel } : {},
      orderBy: [{ gradeLevel: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }, { orderIndex: 'asc' }],
    });
    return NextResponse.json({ success: true, slots });
  } catch (error) {
    return handleApiError('admin/timetable:list', error);
  }
}

// POST /api/v1/admin/timetable — урок в шаблон параллели (влияет на спринты, создаваемые после)
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const gradeLevel = cleanGrade(body.gradeLevel);
    const dayOfWeek = cleanDayOfWeek(body.dayOfWeek, 6);
    const startTime = cleanTime(body.startTime);
    const endTime = cleanTime(body.endTime);
    const title = cleanText(body.title, 150, 1);

    if (!gradeLevel || !dayOfWeek || !startTime || !endTime || !title) {
      return badRequest('Заполните все поля: параллель, день недели (Пн–Сб), начало и конец (ЧЧ:ММ), предмет');
    }
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return badRequest('Урок должен заканчиваться позже, чем начинается');
    }

    const sameDay = await prisma.timetableSlot.count({ where: { gradeLevel, dayOfWeek } });
    const slot = await prisma.timetableSlot.create({
      data: { gradeLevel, dayOfWeek, startTime, endTime, title, orderIndex: sameDay + 1 },
    });

    await audit({
      ...auditActor(auth.ctx),
      action: 'TIMETABLE_SLOT_CREATED',
      targetType: 'TIMETABLE',
      targetId: slot.id,
      details: `${gradeLevel} класс, ${DAY_SHORT[dayOfWeek]} ${startTime}–${endTime}: ${title}`,
    });

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    return handleApiError('admin/timetable:create', error, 'Не удалось добавить урок');
  }
}

// DELETE /api/v1/admin/timetable?id=...
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return badRequest('Не указан урок');

    const slot = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) return NextResponse.json({ error: 'Урок не найден' }, { status: 404 });

    await prisma.timetableSlot.delete({ where: { id } });

    await audit({
      ...auditActor(auth.ctx),
      action: 'TIMETABLE_SLOT_DELETED',
      targetType: 'TIMETABLE',
      targetId: id,
      details: `${slot.gradeLevel} класс, ${DAY_SHORT[slot.dayOfWeek] || slot.dayOfWeek} ${slot.startTime}–${slot.endTime}: ${slot.title}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('admin/timetable:delete', error, 'Не удалось удалить урок');
  }
}
