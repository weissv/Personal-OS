import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePresignedUploadUrl } from '@/lib/storage';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForWeek } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { weekId, fileName, fileType, fileSize, note } = body;

    if (!weekId || !fileName || !fileType) {
      return NextResponse.json(
        { error: 'weekId, fileName, and fileType are required' },
        { status: 400 }
      );
    }

    const studentId = await studentIdForWeek(weekId);
    if (!studentId) return notFoundResponse('Неделя не найдена');

    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) {
      return denyResponse();
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId },
    });

    if (!week) {
      return notFoundResponse('Неделя не найдена');
    }

    const { uploadUrl, publicUrl } = await generatePresignedUploadUrl({
      weekId,
      fileName,
      fileType,
      fileSize: fileSize || 0,
    });

    // Create MediaAsset record
    const asset = await prisma.mediaAsset.create({
      data: {
        weekId,
        fileName,
        fileType,
        fileSize: fileSize || 0,
        fileUrl: publicUrl,
        note: note ? String(note).slice(0, 500) : null,
      },
    });

    return NextResponse.json({
      uploadUrl,
      assetId: asset.id,
      publicUrl,
      asset,
    });
  } catch (error) {
    console.error('Failed to create upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate pre-signed upload URL', details: String(error) },
      { status: 500 }
    );
  }
}
