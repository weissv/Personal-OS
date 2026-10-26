import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { UPLOAD_DIR } from '@/lib/storage';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing asset id' }, { status: 400 });
    }

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        week: {
          select: {
            sprint: {
              select: {
                studentId: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return notFoundResponse('Медиа-артефакт не найден');
    }

    const studentId = asset.week.sprint.studentId;
    const canWrite = await canAccessStudent(auth.ctx, studentId, 'write');
    if (!canWrite) {
      return denyResponse();
    }

    // Attempt to remove physical file from disk
    if (asset.fileUrl && asset.fileUrl.includes('/api/v1/media/files/')) {
      try {
        const parts = asset.fileUrl.split('/api/v1/media/files/');
        const relativeKey = decodeURIComponent(parts[1]).split('?')[0];
        const safeKey = path.normalize(relativeKey).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.resolve(UPLOAD_DIR, safeKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn('Physical file deletion warning:', err);
      }
    }

    // Delete database record
    await prisma.mediaAsset.delete({
      where: { id },
    });

    await audit({
      actorId: auth.ctx.user.id,
      actorName: auth.ctx.user.fullName,
      action: 'MEDIA_ASSET_DELETED',
      targetType: 'MEDIA_ASSET',
      targetId: id,
      details: `Удален артефакт ${asset.fileName} (${(asset.fileSize / 1024).toFixed(0)} KB) недели ${asset.weekId}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Артефакт успешно удален',
      deletedId: id,
    });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete media asset' },
      { status: 500 }
    );
  }
}
