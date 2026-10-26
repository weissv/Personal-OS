import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForWeek } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.PARENT, Role.ADMIN] }, req);
    if (!auth.ok) return auth.response;

    const { user } = auth.ctx;
    const body = await req.json().catch(() => ({}));
    const { weekId, comment } = body;

    if (!weekId || !comment || !String(comment).trim()) {
      return NextResponse.json(
        { error: 'weekId и comment обязательны для заполнения' },
        { status: 400 }
      );
    }

    const studentId = await studentIdForWeek(weekId);
    if (!studentId) return notFoundResponse('Учебная неделя не найдена');

    if (!(await canAccessStudent(auth.ctx, studentId, 'read'))) {
      return denyResponse();
    }

    const review = await prisma.parentReview.upsert({
      where: { weekId },
      update: {
        comment: String(comment).trim(),
        signedAt: new Date(),
      },
      create: {
        weekId,
        comment: String(comment).trim(),
        signedAt: new Date(),
      },
    });

    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: 'PARENT_REVIEW_SIGNED',
      targetType: 'WEEK',
      targetId: weekId,
      details: `Комментарий родителя сохранен для недели ${weekId}`,
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Комментарий родителя подписан и сохранен!',
    });
  } catch (error) {
    console.error('Parent review error:', error);
    return NextResponse.json({ error: 'Failed to save parent review' }, { status: 500 });
  }
}
