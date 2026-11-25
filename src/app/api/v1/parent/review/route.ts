import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse, studentIdForWeek } from '@/lib/auth';
import { audit, auditActor } from '@/lib/audit';
import { cleanText } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.PARENT, Role.ADMIN] }, req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const weekId = typeof body.weekId === 'string' ? body.weekId : '';
    const comment = cleanText(body.comment, 2000, 1);

    if (!weekId || !comment) {
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
        comment,
        signedAt: new Date(),
      },
      create: {
        weekId,
        comment,
        signedAt: new Date(),
      },
    });

    await audit({
      ...auditActor(auth.ctx),
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
    return handleApiError('parent/review', error, 'Не удалось сохранить комментарий');
  }
}
