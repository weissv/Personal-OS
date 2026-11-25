import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { LOCAL_MEDIA_PREFIX, resolveUploadPath } from '@/lib/storage';
import { authenticate, badRequest, canAccessStudent, denyResponse, handleApiError, notFoundResponse } from '@/lib/auth';
import { cleanMediaType, MAX_MEDIA_BYTES } from '@/lib/validation';

const KEY_RE = /^weeks\/[0-9a-f-]{36}\/\d{10,16}-[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

/**
 * Шаг 2 загрузки (локальное хранилище): PUT файла по ключу, который выдал /media/upload-url.
 * Принимаются только ключи зарегистрированных MediaAsset, к которым у пользователя есть право записи.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const key = new URL(req.url).searchParams.get('key') || '';
    if (!KEY_RE.test(key)) return badRequest('Некорректный ключ загрузки');

    const asset = await prisma.mediaAsset.findFirst({
      where: { fileUrl: `${LOCAL_MEDIA_PREFIX}${key}` },
      include: { week: { select: { sprint: { select: { studentId: true } } } } },
    });
    if (!asset) return notFoundResponse('Загрузка не зарегистрирована');
    if (!(await canAccessStudent(auth.ctx, asset.week.sprint.studentId, 'write'))) return denyResponse();

    const contentType = cleanMediaType(req.headers.get('content-type'));
    if (!contentType || contentType !== asset.fileType) {
      return NextResponse.json({ error: 'Тип файла не совпадает с заявленным' }, { status: 415 });
    }

    const declared = Number(req.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: 'Файл слишком большой' }, { status: 413 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (buffer.length === 0) return badRequest('Пустой файл');
    if (buffer.length > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: 'Файл слишком большой' }, { status: 413 });
    }

    const target = resolveUploadPath(key);
    if (!target) return badRequest('Некорректный ключ загрузки');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);

    if (buffer.length !== asset.fileSize) {
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { fileSize: buffer.length } });
    }

    return NextResponse.json({ success: true, key });
  } catch (error) {
    return handleApiError('media/upload', error, 'Не удалось сохранить файл');
  }
}
