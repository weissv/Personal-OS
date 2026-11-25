/**
 * MEZON SPRINT OS - POKA-YOKE SLOT STATE MACHINE (ポカヨケ)
 *
 * Enforces deterministic lifecycle transitions for daily tasks and lessons.
 * Rejects illegal or unverified state mutations at the domain boundary.
 */

import { SlotStatus } from '@prisma/client';

export const ALLOWED_TRANSITIONS: Record<SlotStatus, readonly SlotStatus[]> = {
  // PENDING (новый/призрачный урок): может перейти в выполненный, перенесенный или отмененный
  [SlotStatus.PENDING]: [SlotStatus.DONE, SlotStatus.MIGRATED, SlotStatus.DROPPED],

  // DONE (выполнено): можно только вернуть в PENDING (отмена случайной отметки)
  [SlotStatus.DONE]: [SlotStatus.PENDING],

  // MIGRATED (перенесено): можно только отменить перенос (вернуть в PENDING)
  [SlotStatus.MIGRATED]: [SlotStatus.PENDING],

  // DROPPED (отменено осознанно): можно восстановить в PENDING
  [SlotStatus.DROPPED]: [SlotStatus.PENDING],
} as const;

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export function validateSlotTransition(current: SlotStatus, next: SlotStatus): TransitionResult {
  // Idempotent: same status is always allowed
  if (current === next) {
    return { allowed: true };
  }

  const allowedNext = ALLOWED_TRANSITIONS[current];
  if (!allowedNext || !allowedNext.includes(next)) {
    return {
      allowed: false,
      reason: `POKA_YOKE_VIOLATION: Illegal slot status transition from '${current}' to '${next}'. Allowed target states: [${(allowedNext || []).join(', ')}]`,
    };
  }

  return { allowed: true };
}

/**
 * Путь перехода для пакетного дебрифинга. Ученик может пересмотреть решение
 * (DONE → MIGRATED): терминальные статусы связаны только через PENDING, поэтому
 * такой переход раскладывается на два легальных шага [PENDING, next].
 * Возвращает null, если путь невозможен.
 */
export function resolveTransitionPath(current: SlotStatus, next: SlotStatus): SlotStatus[] | null {
  if (current === next) return [];
  if (validateSlotTransition(current, next).allowed) return [next];
  if (
    validateSlotTransition(current, SlotStatus.PENDING).allowed &&
    validateSlotTransition(SlotStatus.PENDING, next).allowed
  ) {
    return [SlotStatus.PENDING, next];
  }
  return null;
}
