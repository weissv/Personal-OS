import { connection, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { UPLOAD_DIR } from '@/lib/storage';

/**
 * Genchi Genbutsu: проверка реального состояния, а не «всё зелёное».
 * 200 — сервис работает (БД доступна); 503 — БД недоступна.
 * Публичный ответ не раскрывает количества пользователей и пути на диске.
 */
export async function GET() {
  await connection(); // всегда выполняется на запросе, никогда не пререндерится
  const startedAt = Date.now();

  let dbLatencyMs: number | null = null;
  let databaseOk = false;
  try {
    const t = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t;
    databaseOk = true;
  } catch (error) {
    console.error('Health probe: database unavailable', error);
  }

  let auditImmutability: 'ACTIVE_AND_ENFORCED' | 'TRIGGER_ABSENT' | 'UNKNOWN' = 'UNKNOWN';
  if (databaseOk) {
    try {
      const triggers = await prisma.$queryRaw<Array<{ tgname: string }>>`
        SELECT tgname FROM pg_trigger WHERE tgname IN ('audit_log_immutable', 'audit_log_no_truncate')
      `;
      auditImmutability = triggers.length === 2 ? 'ACTIVE_AND_ENFORCED' : 'TRIGGER_ABSENT';
    } catch {
      auditImmutability = 'UNKNOWN';
    }
  }

  let storageWritable = false;
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const probe = path.join(UPLOAD_DIR, `.health-${process.pid}.tmp`);
    await fs.writeFile(probe, String(Date.now()));
    await fs.unlink(probe);
    storageWritable = true;
  } catch {
    storageWritable = false;
  }

  const mem = process.memoryUsage();
  const degraded = !storageWritable || auditImmutability !== 'ACTIVE_AND_ENFORCED';

  return NextResponse.json(
    {
      status: !databaseOk ? 'error' : degraded ? 'degraded' : 'ok',
      service: 'mezon-sprint-os',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      diagnostics: {
        totalCheckDurationMs: Date.now() - startedAt,
        database: { status: databaseOk ? 'CONNECTED' : 'UNAVAILABLE', latencyMs: dbLatencyMs },
        invariantI3_AuditImmutable: auditImmutability,
        storage: { writable: storageWritable },
        process: {
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
          rssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
          node: process.version,
        },
      },
    },
    { status: databaseOk ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
