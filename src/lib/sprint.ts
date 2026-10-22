import { randomUUID } from 'crypto';
import { SlotStatus, SlotType } from '@prisma/client';
import prisma from './prisma';

const DAY_MS = 24 * 60 * 60 * 1000;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // школа в Ташкенте (UTC+5, без перехода на летнее время)

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Полночь UTC, соответствующая сегодняшней календарной дате в Ташкенте. */
export function todayUTC(now: number = Date.now()): Date {
  const t = new Date(now + TASHKENT_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}

/** Номер дня недели в Ташкенте: 1 (Пн) .. 7 (Вс). */
export function todayWeekdayTashkent(now: number = Date.now()): number {
  const d = new Date(now + TASHKENT_OFFSET_MS).getUTCDay();
  return d === 0 ? 7 : d;
}

/** 'YYYY-MM-DD' → полночь UTC. null, если формат неверный. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function mondayOnOrBefore(d: Date): Date {
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  return addDays(d, -(dow - 1));
}

/** Текущая неделя спринта по датам (с ограничением 1..weeksTotal). */
export function getCurrentWeekNumber(sprint: { startDate: Date; weeksTotal: number }, today = todayUTC()): number {
  const diff = Math.floor((today.getTime() - sprint.startDate.getTime()) / DAY_MS);
  const week = Math.floor(diff / 7) + 1;
  return Math.min(Math.max(week, 1), sprint.weeksTotal);
}

/** Выбор активного спринта: идущий сейчас, иначе ближайший прошедший, иначе ближайший будущий. */
export function pickActiveSprint<T extends { startDate: Date; endDate: Date }>(sprints: T[], today = todayUTC()): T | null {
  if (!sprints.length) return null;
  const current = sprints.find((s) => s.startDate <= today && today <= s.endDate);
  if (current) return current;
  const past = sprints.filter((s) => s.endDate < today).sort((a, b) => b.endDate.getTime() - a.endDate.getTime());
  if (past.length) return past[0];
  return [...sprints].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
}

/** Шаблон «текущего спринта школы» — по нему регистрируются новые ученики в середине четверти. */
export async function getSchoolSprintTemplate() {
  const sprints = await prisma.sprint.findMany({
    select: { title: true, startDate: true, endDate: true, weeksTotal: true },
    orderBy: { startDate: 'desc' },
    take: 200,
  });
  const picked = pickActiveSprint(sprints);
  if (!picked) return null;
  return { title: picked.title, startDate: picked.startDate, weeksTotal: picked.weeksTotal };
}

interface GenerateOptions {
  studentId: string;
  gradeLevel: number | null;
  title: string;
  startDate: Date; // понедельник
  weeksTotal?: number;
}

/**
 * Создаёт спринт ученика: недели → дни (Пн–Вс) → «призрачные» уроки из шаблона расписания параллели.
 * Суббота (самостоятельная работа) и воскресенье (ретро) остаются пустыми — их наполняет ученик.
 */
export async function generateSprintForStudent(opts: GenerateOptions) {
  const weeksTotal = Math.min(Math.max(opts.weeksTotal ?? 10, 1), 16);
  const start = mondayOnOrBefore(opts.startDate);
  const end = addDays(start, weeksTotal * 7 - 1);

  const template =
    opts.gradeLevel != null
      ? await prisma.timetableSlot.findMany({
          where: { gradeLevel: opts.gradeLevel },
          orderBy: [{ dayOfWeek: 'asc' }, { orderIndex: 'asc' }, { startTime: 'asc' }],
        })
      : [];

  const sprintId = randomUUID();
  const weeks: Array<{ id: string; sprintId: string; weekNumber: number; startDate: Date; endDate: Date }> = [];
  const days: Array<{ id: string; weekId: string; date: Date; dayOfWeek: number; isSelfStudy: boolean }> = [];
  const slots: Array<{
    dayId: string; startTime: string; endTime: string; title: string;
    type: SlotType; isGhost: boolean; status: SlotStatus; orderIndex: number;
  }> = [];

  for (let w = 0; w < weeksTotal; w++) {
    const weekStart = addDays(start, w * 7);
    const weekId = randomUUID();
    weeks.push({ id: weekId, sprintId, weekNumber: w + 1, startDate: weekStart, endDate: addDays(weekStart, 6) });

    for (let d = 1; d <= 7; d++) {
      const dayId = randomUUID();
      days.push({ id: dayId, weekId, date: addDays(weekStart, d - 1), dayOfWeek: d, isSelfStudy: d === 6 });

      template
        .filter((t) => t.dayOfWeek === d)
        .forEach((t, i) =>
          slots.push({
            dayId,
            startTime: t.startTime,
            endTime: t.endTime,
            title: t.title,
            type: SlotType.ACADEMIC_LESSON,
            isGhost: true,
            status: SlotStatus.PENDING,
            orderIndex: i,
          })
        );
    }
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.sprint.create({
        data: { id: sprintId, studentId: opts.studentId, title: opts.title, startDate: start, endDate: end, weeksTotal },
      });
      await tx.week.createMany({ data: weeks });
      await tx.day.createMany({ data: days });
      if (slots.length) await tx.daySlot.createMany({ data: slots });
    },
    { timeout: 30000 }
  );

  return { sprintId, weeksTotal, startDate: start, endDate: end, lessonsPerWeek: template.length };
}
