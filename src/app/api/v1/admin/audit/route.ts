import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, handleApiError } from '@/lib/auth';

// GET /api/v1/admin/audit?limit=50&action=LOGIN_FAILED
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const parsed = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(Number.isFinite(parsed) ? parsed : 50, 1), 200);
    const action = searchParams.get('action');

    const logs = await prisma.auditLog.findMany({
      where: action && /^[A-Z_]{2,40}$/.test(action) ? { action } : {},
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return handleApiError('admin/audit', error);
  }
}
