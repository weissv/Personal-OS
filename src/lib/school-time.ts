/**
 * Время школы. Mezon находится в Ташкенте (UTC+5, без перехода на летнее время),
 * поэтому расписание, утро/вечер и обратный отсчёт считаются по Ташкенту,
 * а не по часовому поясу устройства (ноутбук в поездке, неверно настроенный телефон).
 *
 * Модуль без зависимостей: используется и на клиенте, и в unit-тестах.
 */

export const TASHKENT_OFFSET_MINUTES = 5 * 60;

export type StudentView = 'morning' | 'evening' | 'saturday' | 'retro';

/** Граница утро/вечер: до 13:00 — утренний фокус, с 13:00 — вечерний дебрифинг. */
export const EVENING_FROM_HOUR = 13;
/** Сдача телефона на вахте. */
export const PHONE_TURN_IN = { hour: 8, minute: 0 };

export interface SchoolClock {
  /** 1 (Пн) .. 7 (Вс) */
  dayOfWeek: number;
  hour: number;
  minute: number;
  second: number;
  /** Минуты от полуночи по Ташкенту */
  minutesOfDay: number;
}

export function schoolClock(now: number = Date.now()): SchoolClock {
  const t = new Date(now + TASHKENT_OFFSET_MINUTES * 60_000);
  const raw = t.getUTCDay();
  const hour = t.getUTCHours();
  const minute = t.getUTCMinutes();
  return {
    dayOfWeek: raw === 0 ? 7 : raw,
    hour,
    minute,
    second: t.getUTCSeconds(),
    minutesOfDay: hour * 60 + minute,
  };
}

/**
 * Умная маршрутизация ученика по дате и времени:
 *  Вс → ретроспектива, Сб → проектный день, Пн–Пт → утро до 13:00, вечер после.
 */
export function smartStudentView(now: number = Date.now()): { view: StudentView; dayOfWeek: number } {
  const c = schoolClock(now);
  if (c.dayOfWeek === 7) return { view: 'retro', dayOfWeek: 7 };
  if (c.dayOfWeek === 6) return { view: 'saturday', dayOfWeek: 6 };
  return { view: c.hour < EVENING_FROM_HOUR ? 'morning' : 'evening', dayOfWeek: c.dayOfWeek };
}

/** Секунд до сдачи телефона сегодня (0, если время уже прошло). */
export function secondsUntilPhoneTurnIn(now: number = Date.now()): number {
  const c = schoolClock(now);
  const target = (PHONE_TURN_IN.hour * 60 + PHONE_TURN_IN.minute) * 60;
  const current = c.minutesOfDay * 60 + c.second;
  return Math.max(0, target - current);
}

/** «08:05» из секунд (минуты могут быть > 59). */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Даты дней/недель хранятся как полночь UTC календарной даты (`@db.Date`).
 * Форматируем в UTC, иначе в западных часовых поясах дата «съезжает» на день назад.
 */
export function formatSchoolDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { ...opts, timeZone: 'UTC' });
}

/** Момент времени (createdAt, signedAt) — по Ташкенту. */
export function formatSchoolDateTime(
  value: string | Date,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }
) {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', { ...opts, timeZone: 'Asia/Tashkent' });
}

/** Сортировка слотов дня: по времени начала, без времени — в конце, затем по orderIndex. */
export function compareSlots(
  a: { startTime: string | null; orderIndex: number },
  b: { startTime: string | null; orderIndex: number }
): number {
  if (a.startTime && b.startTime && a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
  if (a.startTime && !b.startTime) return -1;
  if (!a.startTime && b.startTime) return 1;
  return a.orderIndex - b.orderIndex;
}

/** Русское склонение: plural(1, ['решение', 'решения', 'решений']) → «решение». */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
