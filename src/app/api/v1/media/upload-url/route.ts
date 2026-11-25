import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePresignedUploadUrl } from '@/lib/storage';
import {
  authenticate,
  badRequest,
  canAccessStudent,
  denyResponse,
  handleApiError,
  notFoundResponse,
  studentIdForWeek,
} from '@/lib/auth';
import { cleanFileName, cleanMediaType, cleanText, MAX_MEDIA_BYTES, MEDIA_TYPES } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Шаг 1 загрузки артефакта: регистрирует MediaAsset и выдаёт адрес для PUT.
 * Сам файл принимается /media/upload только для зарегистрированного ключа.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    if (!rateLimit(`upload:${auth.ctx.user.id}`, 60, 60 * 60 * 1000).allowed) {
      return NextResponse.json({ error: 'Слишком много загрузок за час. Попробуйте позже.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const weekId = typeof body.weekId === 'string' ? body.weekId : '';
    const fileType = cleanMediaType(body.fileType);
    const fileSize = Number(body.fileSize);

    if (!weekId) return badRequest('Не указана неделя');
    if (!fileType) {
      return badRequest(`Недопустимый тип файла. Разрешены: ${Object.keys(MEDIA_TYPES).join(', ')}`);
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > MAX_MEDIA_BYTES) {
      return badRequest(`Размер файла должен быть от 1 байта до ${MAX_MEDIA_BYTES / 1024 / 1024} МБ`);
    }

    const studentId = await studentIdForWeek(weekId);
    if (!studentId) return notFoundResponse('Неделя не найдена');
    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) return denyResponse();

    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl({ weekId, fileType, fileSize });

    const asset = await prisma.mediaAsset.create({
      data: {
        weekId,
        fileName: cleanFileName(body.fileName) || `artifact${MEDIA_TYPES[fileType]}`,
        fileType,
        fileSize,
        fileUrl: publicUrl,
        note: cleanText(body.note, 500) || null,
      },
    });

    return NextResponse.json({ uploadUrl, assetId: asset.id, publicUrl, asset });
  } catch (error) {
    return handleApiError('media/upload-url', error, 'Не удалось подготовить загрузку файла');
  }
}
