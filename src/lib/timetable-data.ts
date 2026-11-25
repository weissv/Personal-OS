// Расписание уроков Mezon Inspiring School на 2026-2027 учебный год.
// Источник: MIS_Расписание_2026_2027_21_08_Старшая_школа (2).xlsx
// Единый источник данных — scripts/timetable_data.json (его же читает scripts/ensure-admin.js).
import timetable from '../../scripts/timetable_data.json';

export interface TimetableSlotTemplate {
  gradeLevel: number;
  dayOfWeek: number; // 1 (Пн) .. 5 (Пт)
  startTime: string; // '08:30'
  endTime: string; // '09:10'
  title: string;
  orderIndex: number;
}

const data = timetable as Record<string, TimetableSlotTemplate[]>;

/** Параллели, для которых есть расписание в файле MIS. */
export const TIMETABLE_GRADES: number[] = Object.keys(data).map(Number).sort((a, b) => a - b);

export const TIMETABLE_SLOTS_8_GRADE: TimetableSlotTemplate[] = data['8'] ?? [];
export const TIMETABLE_SLOTS_9_GRADE: TimetableSlotTemplate[] = data['9'] ?? [];

export const ALL_TIMETABLE_SLOTS: TimetableSlotTemplate[] = TIMETABLE_GRADES.flatMap((g) => data[String(g)] ?? []);
