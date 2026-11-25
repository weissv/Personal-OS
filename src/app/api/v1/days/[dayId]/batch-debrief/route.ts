import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus, SlotType } from '@prisma/client';
import {
  authenticate,
  badRequest,
  canAccessStudent,
  denyResponse,
  handleApiError,
  notFoundResponse,
  studentIdForDay,
} from '@/lib/auth';
import { cleanSlotStatus, cleanText, cleanTime } from '@/lib/validation';
import { resolveTransitionPath } from '@/lib/slot-state-machine';
import { cleanMigrationTarget, createMigratedCopy, migrationTargetDayOfWeek } from '@/lib/slot-migration';

const MAX_ITEMS = 60;

interface SlotUpdate {
  id: string;
  status: SlotStatus | null;
  taskGoal?: string | null;
  deliverable?: string | null;
  migrationTarget: ReturnType<typeof cleanMigrationTarget>;
}

/**
 * Вечерний дебрифинг: все решения дня — одной атомарной транзакцией.
 * Каждый слот обязан принадлежать этому дню (защита от подмены id чужих слотов),
 * каждый переход статуса проходит через Poka-Yoke state machine.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ dayId: string }> }) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const { dayId } = await params;
    const studentId = await studentIdForDay(dayId);
    if (!studentId) return notFoundResponse('День не найден');
    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) return denyResponse();

    const body = await req.json().catch(() => ({}));
    const rawUpdates: unknown[] = Array.isArray(body.updatedSlots) ? body.updatedSlots : [];
    const rawEvents: unknown[] = Array.isArray(body.newCustomEvents) ? body.newCustomEvents : [];
    if (rawUpdates.length > MAX_ITEMS || rawEvents.length > MAX_ITEMS) return badRequest('Слишком много изменений за раз');

    const day = await prisma.day.findUnique({
      where: { id: dayId },
      include: {
        slots: true,
        week: { select: { days: { select: { id: true, dayOfWeek: true } } } },
      },
    });
    if (!day) return notFoundResponse('День не найден');
    const slotsById = new Map(day.slots.map((s) => [s.id, s]));

    // 1. Валидация всего пакета до начала записи
    const updates: SlotUpdate[] = [];
    for (const raw of rawUpdates) {
      const item = (raw ?? {}) as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const current = slotsById.get(id);
      if (!current) return badRequest('Слот не относится к этому дню');

      const status = item.status === undefined ? null : cleanSlotStatus(item.status);
      if (item.status !== undefined && !status) return badRequest(`Неверный статус для «${current.title}»`);
      if (status && !resolveTransitionPath(current.status, status)) {
        return badRequest(`POKA_YOKE_VIOLATION: недопустимый переход «${current.title}»: ${current.status} → ${status}`);
      }
      updates.push({
        id,
        status,
        taskGoal: item.taskGoal === undefined ? undefined : cleanText(item.taskGoal, 1000) || null,
        deliverable: item.deliverable === undefined ? undefined : cleanText(item.deliverable, 1000) || null,
        migrationTarget: cleanMigrationTarget(item.migrationTarget),
      });
    }

    const events: Array<{
      title: string;
      startTime: string | null;
      endTime: string | null;
      taskGoal: string | null;
      deliverable: string | null;
      status: SlotStatus;
    }> = [];
    for (const raw of rawEvents) {
      const ev = (raw ?? {}) as Record<string, unknown>;
      const title = cleanText(ev.title, 150, 1);
      if (!title) return badRequest('У события должно быть название');
      events.push({
        title,
        startTime: cleanTime(ev.startTime),
        endTime: cleanTime(ev.endTime),
        taskGoal: cleanText(ev.taskGoal, 1000) || null,
        deliverable: cleanText(ev.deliverable, 1000) || null,
        status: cleanSlotStatus(ev.status) || SlotStatus.DONE,
      });
    }

    // 2. Атомарная запись
    const result = await prisma.$transaction(async (tx) => {
      let updatedCount = 0;
      let migratedCount = 0;

      for (const u of updates) {
        const current = slotsById.get(u.id)!;
        const nextStatus = u.status ?? current.status;
        const statusChanged = nextStatus !== current.status;
        const goal = u.taskGoal !== undefined ? u.taskGoal : current.taskGoal;
        const dod = u.deliverable !== undefined ? u.deliverable : current.deliverable;
        const textChanged = goal !== current.taskGoal || dod !== current.deliverable;
        if (!statusChanged && !textChanged) continue;

        await tx.daySlot.update({
          where: { id: u.id },
          data: {
            status: nextStatus,
            taskGoal: goal,
            deliverable: dod,
            // Призрачный урок становится задачей, только когда по нему принято решение или задана цель
            ...(current.isGhost && (nextStatus !== SlotStatus.PENDING || goal || dod) ? { isGhost: false } : {}),
          },
        });
        updatedCount++;

        if (statusChanged && nextStatus === SlotStatus.MIGRATED && u.migrationTarget) {
          const dow = migrationTargetDayOfWeek(day.dayOfWeek, u.migrationTarget);
          const targetDay = dow ? day.week.days.find((d) => d.dayOfWeek === dow) : undefined;
          if (targetDay) {
            await createMigratedCopy(tx, { ...current, taskGoal: goal, deliverable: dod }, targetDay);
            migratedCount++;
          }
        }
      }

      for (const [i, ev] of events.entries()) {
        await tx.daySlot.create({
          data: { dayId, ...ev, type: SlotType.CUSTOM_EVENT, isGhost: false, orderIndex: 100 + i },
        });
      }

      const updatedDay = await tx.day.findUnique({
        where: { id: dayId },
        include: { slots: { orderBy: [{ orderIndex: 'asc' }, { startTime: 'asc' }] } },
      });

      return {
        updatedSlotsCount: updatedCount,
        migratedCopiesCount: migratedCount,
        createdEventsCount: events.length,
        day: updatedDay,
      };
    });

    return NextResponse.json({ success: true, data: result, message: 'День закрыт: решения сохранены' });
  } catch (error) {
    return handleApiError('days/batch-debrief', error, 'Не удалось сохранить вечерний дебрифинг');
  }
}
