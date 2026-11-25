import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse, studentIdForWeek } from '@/lib/auth';
import { audit, auditActor } from '@/lib/audit';
import { cleanText } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.MENTOR, Role.ADMIN] }, req);
    if (!auth.ok) return auth.response;

    const { user } = auth.ctx;
    const body = await req.json().catch(() => ({}));
    const weekId = typeof body.weekId === 'string' ? body.weekId : '';
    const feedback = cleanText(body.feedback, 4000, 1);
    const customMentorId = typeof body.mentorId === 'string' ? body.mentorId : null;

    if (!weekId || !feedback) {
      return NextResponse.json(
        { error: 'weekId и feedback обязательны для заполнения' },
        { status: 400 }
      );
    }

    const studentId = await studentIdForWeek(weekId);
    if (!studentId) return notFoundResponse('Учебная неделя не найдена');

    if (!(await canAccessStudent(auth.ctx, studentId, 'read'))) {
      return denyResponse();
    }

    // Подписант: сам куратор; администратор может подписать от имени конкретного куратора
    let mentorId = user.id;
    if (user.role === Role.ADMIN && customMentorId) {
      const signer = await prisma.user.findUnique({ where: { id: customMentorId }, select: { role: true } });
      if (!signer || (signer.role !== Role.MENTOR && signer.role !== Role.ADMIN)) {
        return NextResponse.json({ error: 'Подписант должен быть куратором' }, { status: 400 });
      }
      mentorId = customMentorId;
    }

    const review = await prisma.mentorReview.upsert({
      where: { weekId },
      update: {
        mentorId,
        feedback,
        signedAt: new Date(),
      },
      create: {
        weekId,
        mentorId,
        feedback,
        signedAt: new Date(),
      },
    });

    await audit({
      ...auditActor(auth.ctx),
      action: 'MENTOR_REVIEW_SIGNED',
      targetType: 'WEEK',
      targetId: weekId,
      details: `Ревью наставника сохранено для недели ${weekId}`,
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Ревью наставника подписано и сохранено!',
    });
  } catch (error) {
    return handleApiError('mentor/review', error, 'Не удалось сохранить ревью');
  }
}
