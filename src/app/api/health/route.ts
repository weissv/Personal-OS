import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/storage';

export async function GET() {
  const startTime = Date.now();
  let dbLatencyMs = -1;
  let invariantsStatus = 'UNKNOWN';
  let storageWritable = false;

  try {
    // 1. Measure DB query Round-Trip Time
    const dbPingStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbPingStart;

    // 2. Check Invariant I3 trigger status
    try {
      const triggers: any[] = await prisma.$queryRaw`
        SELECT tgname FROM pg_trigger WHERE tgname = 'audit_log_immutable';
      `;
      invariantsStatus = triggers.length > 0 ? 'ACTIVE_AND_ENFORCED' : 'TRIGGER_ABSENT';
    } catch {
      invariantsStatus = 'NON_POSTGRES_OR_EMBEDDED';
    }

    // 3. Storage Write Probe (test persistence of uploads volume)
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const probeFile = path.join(UPLOAD_DIR, '.health-probe.tmp');
      fs.writeFileSync(probeFile, String(Date.now()));
      fs.unlinkSync(probeFile);
      storageWritable = true;
    } catch {
      storageWritable = false;
    }

    // 4. Counts summary
    const [userCount, sprintCount] = await Promise.all([
      prisma.user.count(),
      prisma.sprint.count(),
    ]);

    const mem = process.memoryUsage();

    return NextResponse.json({
      status: 'ok',
      service: 'mezon-sprint-os',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      diagnostics: {
        totalCheckDurationMs: Date.now() - startTime,
        database: {
          status: 'CONNECTED',
          latencyMs: dbLatencyMs,
          usersTotal: userCount,
          sprintsTotal: sprintCount,
          invariantI3_AuditImmutable: invariantsStatus,
        },
        storage: {
          uploadDir: UPLOAD_DIR,
          writable: storageWritable,
        },
        process: {
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('Health probe failure:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'System diagnostic failure',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
