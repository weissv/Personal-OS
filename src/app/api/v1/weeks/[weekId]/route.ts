import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse, parentAccessLevelFor } from '@/lib/auth';


const MAX_TEXT = 5000;
/** undefined — поле не меняем; пустая строка — очищаем (null). */
const clip = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.trim().slice(0, max) || null : undefined);

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

    let accessLevel: ParentAccessLevel;
    if (ctx.user.role === Role.PARENT) {
      accessLevel = await parentAccessLevelFor(ctx.user.id, week.sprint.studentId);
    } else {
      // Для ученика/куратора — уровень, который ученик выдал семье (одинаков для всех родителей)
      const link = await prisma.parentStudentLink.findFirst({
        where: { studentId: week.sprint.studentId },
        orderBy: { createdAt: 'asc' },
        select: { accessLevel: true },
      });
      accessLevel = link?.accessLevel ?? ParentAccessLevel.REVOKED;
    }

    if (ctx.user.role === Role.PARENT && accessLevel === ParentAccessLevel.SUMMARY_ONLY) {
      // Сводный доступ: цели недели, субботний проект и ретро. Без лога уроков, личных заметок и медиа.
      return NextResponse.json({
        week: {
          ...week,
          notes: null,
          ideas: null,
          sketchesNote: null,
          days: week.days.map((day) => ({ ...day, slots: day.isSelfStudy ? day.slots : [] })),
          mediaAssets: [],
          parentAccessLevel: accessLevel,
        },
      });
    }

    return NextResponse.json({ week: { ...week, parentAccessLevel: accessLevel } });
  } catch (error) {
    return handleApiError('weeks/get', error, 'Не удалось загрузить неделю');
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
        ...(clip(body.weekGoal) !== undefined && { weekGoal: clip(body.weekGoal, 300) }),
        ...(clip(body.deadlinesEvents) !== undefined && { deadlinesEvents: clip(body.deadlinesEvents, 300) }),
        ...(clip(body.notes) !== undefined && { notes: clip(body.notes) }),
        ...(clip(body.ideas) !== undefined && { ideas: clip(body.ideas) }),
        ...(clip(body.sketchesNote) !== undefined && { sketchesNote: clip(body.sketchesNote) }),
      },
    });
    return NextResponse.json({ success: true, week: updated });
  } catch (error) {
    return handleApiError('weeks/update', error, 'Не удалось сохранить неделю');
  }
}
