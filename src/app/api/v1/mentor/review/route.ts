import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse, studentIdForWeek } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.MENTOR, Role.ADMIN] });
    if (!auth.ok) return auth.response;

    const { user } = auth.ctx;
    const body = await req.json().catch(() => ({}));
    const { weekId, feedback, mentorId: customMentorId } = body;

    if (!weekId || !feedback || !String(feedback).trim()) {
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

    // Determine mentor ID: use current user's ID, or if admin, allow customMentorId
    const mentorId = (user.role === Role.ADMIN && customMentorId) ? customMentorId : user.id;

    const review = await prisma.mentorReview.upsert({
      where: { weekId },
      update: {
        mentorId,
        feedback: String(feedback).trim(),
        signedAt: new Date(),
      },
      create: {
        weekId,
        mentorId,
        feedback: String(feedback).trim(),
        signedAt: new Date(),
      },
    });

    await audit({
      actorId: user.id,
      actorName: user.fullName,
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
    console.error('Mentor review error:', error);
    return NextResponse.json({ error: 'Failed to save mentor review' }, { status: 500 });
  }
}
