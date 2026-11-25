import { SlotStatus, SlotType } from '@prisma/client';
import type { DaySlot, Prisma } from '@prisma/client';

export const MIGRATED_PREFIX = '[Перенесено] ';
export type MigrationTarget = 'tomorrow' | 'saturday';

export function cleanMigrationTarget(v: unknown): MigrationTarget | null {
  return v === 'tomorrow' || v === 'saturday' ? v : null;
}

/** День недели, куда переносится задача. null — перенос внутри недели невозможен. */
export function migrationTargetDayOfWeek(sourceDayOfWeek: number, target: MigrationTarget): number | null {
  const dow = target === 'saturday' ? 6 : sourceDayOfWeek + 1;
  if (dow === sourceDayOfWeek || dow > 6) return null; // воскресенье — день ретро, не задач
  return dow;
}

/**
 * Создаёт копию перенесённой задачи в целевом дне (status PENDING, не ghost).
 * Префикс «[Перенесено]» не накапливается при повторных переносах.
 */
export function createMigratedCopy(
  tx: Prisma.TransactionClient,
  slot: Pick<DaySlot, 'title' | 'type' | 'taskGoal' | 'deliverable'>,
  targetDay: { id: string; dayOfWeek: number }
) {
  const baseTitle = slot.title.startsWith(MIGRATED_PREFIX) ? slot.title.slice(MIGRATED_PREFIX.length) : slot.title;
  return tx.daySlot.create({
    data: {
      dayId: targetDay.id,
      title: `${MIGRATED_PREFIX}${baseTitle}`.slice(0, 150),
      type: targetDay.dayOfWeek === 6 ? SlotType.SELF_STUDY : slot.type,
      isGhost: false,
      taskGoal: slot.taskGoal,
      deliverable: slot.deliverable,
      status: SlotStatus.PENDING,
      orderIndex: 200,
    },
  });
}
