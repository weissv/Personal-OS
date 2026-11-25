import { NextRequest, NextResponse } from 'next/server';
import { Role, SlotStatus, SlotType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, handleApiError } from '@/lib/auth';
import { generatePassword, hashPassword } from '@/lib/password';
import { ALL_TIMETABLE_SLOTS, TIMETABLE_GRADES } from '@/lib/timetable-data';
import { pickActiveSprint } from '@/lib/sprint';
import { audit, auditActor } from '@/lib/audit';

/** Кураторы параллелей из расписания MIS. Пароли в коде не хранятся. */
const CURATORS = [
  { fullName: 'Тамилла', username: 'tamilla', email: 'tamilla@mezon.uz', gradeLevel: 8 },
  { fullName: 'Феруза', username: 'feruza', email: 'feruza@mezon.uz', gradeLevel: 9 },
];

/**
 * Синхронизация с расписанием MIS:
 *  1. создаёт недостающих кураторов (существующих не трогает — их пароли сохраняются);
 *  2. пересобирает шаблон расписания параллелей из файла MIS;
 *  3. заполняет «призрачными» уроками будни активных спринтов, где уроков ещё нет.
 * Временные пароли новых кураторов возвращаются один раз — их нужно передать лично.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const createdCurators: Array<{ fullName: string; username: string; temporaryPassword: string }> = [];
    for (const c of CURATORS) {
      const exists = await prisma.user.findFirst({ where: { OR: [{ email: c.email }, { username: c.username }] } });
      if (exists) continue;
      const temporaryPassword = generatePassword();
      await prisma.user.create({
        data: { ...c, role: Role.MENTOR, passwordHash: hashPassword(temporaryPassword), isActive: true },
      });
      createdCurators.push({ fullName: c.fullName, username: c.username, temporaryPassword });
    }

    const templateCount = await prisma.$transaction(async (tx) => {
      await tx.timetableSlot.deleteMany({ where: { gradeLevel: { in: TIMETABLE_GRADES } } });
      const res = await tx.timetableSlot.createMany({ data: ALL_TIMETABLE_SLOTS });
      return res.count;
    });

    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT, gradeLevel: { in: TIMETABLE_GRADES } },
      select: {
        gradeLevel: true,
        sprints: {
          select: {
            startDate: true,
            endDate: true,
            weeks: { select: { days: { select: { id: true, dayOfWeek: true, _count: { select: { slots: true } } } } } },
          },
        },
      },
    });

    const ghostSlots = [];
    for (const st of students) {
      const sprint = pickActiveSprint(st.sprints);
      if (!sprint) continue;
      const lessons = ALL_TIMETABLE_SLOTS.filter((s) => s.gradeLevel === st.gradeLevel);
      for (const week of sprint.weeks) {
        for (const day of week.days) {
          if (day.dayOfWeek > 5 || day._count.slots > 0) continue;
          for (const l of lessons.filter((x) => x.dayOfWeek === day.dayOfWeek)) {
            ghostSlots.push({
              dayId: day.id,
              startTime: l.startTime,
              endTime: l.endTime,
              title: l.title,
              type: SlotType.ACADEMIC_LESSON,
              isGhost: true,
              status: SlotStatus.PENDING,
              orderIndex: l.orderIndex,
            });
          }
        }
      }
    }
    if (ghostSlots.length) await prisma.daySlot.createMany({ data: ghostSlots });

    await audit({
      ...auditActor(auth.ctx),
      action: 'TIMETABLE_SYNCED',
      targetType: 'TIMETABLE',
      details: `Шаблон: ${templateCount} уроков; заполнено слотов: ${ghostSlots.length}; новых кураторов: ${createdCurators.length}`,
    });

    return NextResponse.json({
      success: true,
      timetableSlotsCount: templateCount,
      totalSlotsPopulated: ghostSlots.length,
      createdCurators,
    });
  } catch (error) {
    return handleApiError('admin/sync', error, 'Не удалось синхронизировать расписание');
  }
}
