import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { resolveUploadPath } from '@/lib/storage';
import { authenticate, canAccessStudentMedia, denyResponse, handleApiError, studentIdForWeek } from '@/lib/auth';
import { MEDIA_CONTENT_TYPES } from '@/lib/validation';

/**
 * Отдача медиа-артефакта с проверкой Selective Trust RBAC.
 * Ключ: weeks/{weekId}/{timestamp}-{uuid}.{ext}. Любой другой путь — 404.
 * Токен в ?token= допускается только здесь: <img>/<audio> не умеют слать заголовки.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const auth = await authenticate({ allowQueryToken: true }, req);
    if (!auth.ok) return auth.response;

    const { path: segments } = await params;
    let key: string;
    try {
      key = (segments || []).map((s) => decodeURIComponent(s)).join('/');
    } catch {
      return NextResponse.json({ error: 'Некорректный путь' }, { status: 400 });
    }

    const parts = key.split('/');
    if (parts.length !== 3 || parts[0] !== 'weeks') {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    }

    const filePath = resolveUploadPath(key);
    if (!filePath) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });

    const studentId = await studentIdForWeek(parts[1]);
    if (!studentId) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    if (!(await canAccessStudentMedia(auth.ctx, studentId))) return denyResponse();

    let file: Buffer;
    try {
      file = await fs.readFile(filePath);
    } catch {
      return NextResponse.json({ error: 'Файл не найден в хранилище' }, { status: 404 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const headers: Record<string, string> = {
      'Content-Type': MEDIA_CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Length': String(file.length),
      'Cache-Control': 'private, no-transform, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    };
    if (req.nextUrl.searchParams.get('download') === 'true') {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`;
    }

    return new NextResponse(new Uint8Array(file), { headers });
  } catch (error) {
    return handleApiError('media/files', error, 'Не удалось прочитать файл');
  }
}
