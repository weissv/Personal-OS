import prisma from './prisma';

export interface AuditEntry {
  actorId?: string | null;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: string;
}

/** Запись в журнал. Ошибки журнала не должны ломать основную операцию. */
export async function audit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName: entry.actorName,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetName: entry.targetName,
        details: entry.details?.slice(0, 1000),
      },
    });
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}
