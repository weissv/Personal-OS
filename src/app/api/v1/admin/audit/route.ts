import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, handleApiError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (error) {
    return handleApiError('admin/audit', error);
  }
}
