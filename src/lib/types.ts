/** Общие клиентские типы данных Sprint OS (форма ответов API). */

export type AccessLevel = 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
export type SlotStatusValue = 'PENDING' | 'DONE' | 'MIGRATED' | 'DROPPED';

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, { title: string; hint: string }> = {
  REVOKED: { title: 'Закрыто', hint: 'Родитель ничего не видит' },
  SUMMARY_ONLY: { title: 'Сводка', hint: 'Цели недели, субботний проект и итоги — без лога уроков' },
  FULL_ACCESS: { title: 'Полный доступ', hint: 'Все уроки, статусы и артефакты недели' },
};

export interface DaySlot {
  id: string;
  dayId: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  type: string;
  isGhost: boolean;
  taskGoal: string | null;
  deliverable: string | null;
  status: string;
  orderIndex: number;
}

export interface MediaAsset {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  note: string | null;
  createdAt: string;
}

export interface DayData {
  id: string;
  weekId: string;
  date: string;
  dayOfWeek: number;
  isSelfStudy: boolean;
  slots: DaySlot[];
}

export interface WeekData {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weekGoal: string | null;
  deadlinesEvents: string | null;
  notes: string | null;
  ideas: string | null;
  sketchesNote: string | null;
  retroSuccess: string | null;
  retroBlockers: string | null;
  retroNextPlan: string | null;
  isSubmitted: boolean;
  parentAccessLevel: AccessLevel;
  days: DayData[];
  mediaAssets: MediaAsset[];
  mentorReview?: { feedback: string; signedAt: string; mentor: { fullName: string } } | null;
  parentReview?: { comment: string; signedAt: string } | null;
  sprint?: { id: string; title: string; student: { id: string; fullName: string; gradeLevel: number | null } };
}

export interface SprintWeekSummary {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isSubmitted: boolean;
}

export interface ActiveSprintResponse {
  sprint: {
    id: string;
    title: string;
    weeksTotal: number;
    startDate: string;
    endDate: string;
    weeks: SprintWeekSummary[];
  } | null;
  student: { id: string; fullName: string; gradeLevel: number | null } | null;
  /** Для родителя: все привязанные дети и выданный каждым уровень доступа. */
  children: Array<{ id: string; fullName: string; gradeLevel: number | null; accessLevel: AccessLevel }>;
  currentWeekNumber: number | null;
  parentAccessLevel: AccessLevel;
  reason: 'NO_LINK' | 'NO_STUDENT' | 'NO_SPRINT' | null;
}

export const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

export const DAY_SHORT: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб', 7: 'Вс' };
