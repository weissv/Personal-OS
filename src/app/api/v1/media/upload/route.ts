import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, ensureUploadDir } from '@/lib/storage';
import { authenticate } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate();
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const rawKey = url.searchParams.get('key');

    if (!rawKey) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    // Sanitize key against path traversal
    const safeKey = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
    ensureUploadDir();
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const targetFilePath = path.resolve(resolvedUploadDir, safeKey);

    if (!targetFilePath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
    }

    const targetDir = path.dirname(targetFilePath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetFilePath, buffer);

    return NextResponse.json({ success: true, key: safeKey });
  } catch (error) {
    console.error('Local upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
