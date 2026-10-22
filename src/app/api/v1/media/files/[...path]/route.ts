import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const fullRelativePath = path.normalize(pathSegments.join('/')).replace(/^(\.\.[\/\\])+/, '');
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(resolvedUploadDir, fullRelativePath);

    if (!filePath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.webm') contentType = 'audio/webm';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
