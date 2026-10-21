import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generatePresignedUploadUrl } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weekId, fileName, fileType, fileSize, note } = body;

    if (!weekId || !fileName || !fileType) {
      return NextResponse.json(
        { error: 'weekId, fileName, and fileType are required' },
        { status: 400 }
      );
    }

    const week = await prisma.week.findUnique({
      where: { id: weekId },
    });

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
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
        note: note || null,
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
