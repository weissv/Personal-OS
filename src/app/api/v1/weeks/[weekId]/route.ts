import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse } from '@/lib/auth';


const MAX_TEXT = 5000;
const clip = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : undefined);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const { weekId } = await params;

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        sprint: { select: { id: true, title: true, studentId: true, student: { select: { id: true, fullName: true, gradeLevel: true } } } },
        days: {
          orderBy: { dayOfWeek: 'asc' },
          include: { slots: { orderBy: [{ orderIndex: 'asc' }, { startTime: 'asc' }] } },
        },
        mediaAssets: { orderBy: { createdAt: 'desc' } },
        mentorReview: { include: { mentor: { select: { id: true, fullName: true } } } },
        parentReview: true,
      },
    });

    if (!week) return notFoundResponse('Неделя не найдена');
    if (!(await canAccessStudent(ctx, week.sprint.studentId, 'read'))) return denyResponse();

    const link = await prisma.parentStudentLink.findFirst({
      where: ctx.user.role === Role.PARENT
        ? { studentId: week.sprint.studentId, parentId: ctx.user.id }
        : { studentId: week.sprint.studentId },
    });
    const accessLevel = link?.accessLevel ?? ParentAccessLevel.REVOKED;

    if (ctx.user.role === Role.PARENT && accessLevel === ParentAccessLevel.SUMMARY_ONLY) {
      // Сводный доступ: скрываем поминутные слоты будней, оставляем субботний проект и ретро
      return NextResponse.json({
        week: {
          ...week,
          days: week.days.map((day) => ({ ...day, slots: day.isSelfStudy ? day.slots : [] })),
          parentAccessLevel: accessLevel,
        },
      });
    }

    return NextResponse.json({ week: { ...week, parentAccessLevel: accessLevel } });
  } catch (error) {
    console.error('Fetch week error:', error);
    return NextResponse.json({ error: 'Не удалось загрузить неделю' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const auth = await authenticate({ roles: [Role.STUDENT] }, req);
    if (!auth.ok) return auth.response;
    const { weekId } = await params;

    const existing = await prisma.week.findUnique({ where: { id: weekId }, select: { sprint: { select: { studentId: true } } } });
    if (!existing) return notFoundResponse('Неделя не найдена');
    if (!(await canAccessStudent(auth.ctx, existing.sprint.studentId, 'write'))) return denyResponse();

    const body = await req.json().catch(() => ({}));
    const updated = await prisma.week.update({
      where: { id: weekId },
      data: {
        ...(clip(body.weekGoal) !== undefined && { weekGoal: clip(body.weekGoal) }),
        ...(clip(body.deadlinesEvents) !== undefined && { deadlinesEvents: clip(body.deadlinesEvents) }),
        ...(clip(body.notes) !== undefined && { notes: clip(body.notes) }),
        ...(clip(body.ideas) !== undefined && { ideas: clip(body.ideas) }),
        ...(clip(body.sketchesNote) !== undefined && { sketchesNote: clip(body.sketchesNote) }),
      },
    });
    return NextResponse.json({ success: true, week: updated });
  } catch (error) {
    console.error('Update week error:', error);
    return NextResponse.json({ error: 'Не удалось сохранить неделю' }, { status: 500 });
  }
}
