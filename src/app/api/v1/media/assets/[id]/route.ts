import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { resolveUploadPath, storageKeyFromUrl } from '@/lib/storage';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse } from '@/lib/auth';
import { audit, auditActor } from '@/lib/audit';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: { week: { select: { weekNumber: true, sprint: { select: { studentId: true } } } } },
    });
    if (!asset) return notFoundResponse('Медиа-артефакт не найден');

    if (!(await canAccessStudent(auth.ctx, asset.week.sprint.studentId, 'write'))) return denyResponse();

    // Сначала запись в БД (источник истины), затем — физический файл
    await prisma.mediaAsset.delete({ where: { id } });

    const key = storageKeyFromUrl(asset.fileUrl);
    const filePath = key ? resolveUploadPath(key) : null;
    if (filePath) {
      await fs.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') console.warn('Physical file deletion warning:', err);
      });
    }

    await audit({
      ...auditActor(auth.ctx),
      action: 'MEDIA_ASSET_DELETED',
      targetType: 'MEDIA_ASSET',
      targetId: id,
      details: `Удалён артефакт «${asset.note || asset.fileName}» (${Math.round(asset.fileSize / 1024)} KB), неделя ${asset.week.weekNumber}`,
    });

    return NextResponse.json({ success: true, message: 'Артефакт удалён', deletedId: id });
  } catch (error) {
    return handleApiError('media/assets', error, 'Не удалось удалить артефакт');
  }
}
