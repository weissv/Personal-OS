import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, ensureUploadDir } from '@/lib/storage';
import { authenticate, canAccessStudent, denyResponse, studentIdForWeek } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    ensureUploadDir();
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    // Decode URL-encoded segments (e.g. %2F -> /)
    const rawJoined = pathSegments.join('/');
    const decodedPath = decodeURIComponent(rawJoined);
    const safeRelativePath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);

    let filePath = path.resolve(resolvedUploadDir, safeRelativePath);

    // 1. Path traversal protection
    if (!filePath.startsWith(resolvedUploadDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 2. Fallback resolution if file path had alternate formatting
    if (!fs.existsSync(filePath)) {
      // Check if file is stored in week subdirectory or by basename
      const baseName = path.basename(safeRelativePath);
      const fallbackDirect = path.resolve(resolvedUploadDir, baseName);
      if (fs.existsSync(fallbackDirect)) {
        filePath = fallbackDirect;
      } else {
        return NextResponse.json(
          { error: 'File not found on server storage', path: safeRelativePath },
          { status: 404 }
        );
      }
    }

    // 3. Selective Trust RBAC Authorization Check
    // Files are structured as: weeks/{weekId}/{timestamp}-{uuid}.{ext}
    const segments = safeRelativePath.split(/[/\\]/);
    if (segments.length >= 2 && segments[0] === 'weeks') {
      const weekId = segments[1];
      const auth = await authenticate({}, req);
      if (!auth.ok) {
        return auth.response;
      }

      const studentId = await studentIdForWeek(weekId);
      if (studentId) {
        const canAccess = await canAccessStudent(auth.ctx, studentId, 'read');
        if (!canAccess) {
          return denyResponse();
        }
      }
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.webm') contentType = 'audio/webm';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.mp3') contentType = 'audio/mpeg';

    const isDownload = req.nextUrl.searchParams.get('download') === 'true';
    const fileName = path.basename(filePath);

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-transform, max-age=86400',
    };

    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(fileName)}"`;
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
