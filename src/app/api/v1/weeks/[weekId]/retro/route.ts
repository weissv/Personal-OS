import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, handleApiError, notFoundResponse } from '@/lib/auth';
import { cleanParentAccessLevel, cleanText } from '@/lib/validation';
import { audit, auditActor } from '@/lib/audit';

const MAX_TEXT = 5000;
const ACCESS_LABEL = { REVOKED: 'закрыт', SUMMARY_ONLY: 'сводка', FULL_ACCESS: 'полный' } as const;

/** Воскресная ретроспектива + суверенный выбор уровня доступа семьи (Invariant I2). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  try {
    const auth = await authenticate({ roles: [Role.STUDENT] }, req);
    if (!auth.ok) return auth.response;
    const { weekId } = await params;
    const body = await req.json().catch(() => ({}));

    const week = await prisma.week.findUnique({ where: { id: weekId }, include: { sprint: true } });
    if (!week) return notFoundResponse('Неделя не найдена');
    const studentId = week.sprint.studentId;
    if (!(await canAccessStudent(auth.ctx, studentId, 'write'))) return denyResponse();

    const retroSuccess = cleanText(body.retroSuccess, MAX_TEXT);
    const retroBlockers = cleanText(body.retroBlockers, MAX_TEXT);
    const retroNextPlan = cleanText(body.retroNextPlan, MAX_TEXT);
    if (!retroSuccess || !retroBlockers || !retroNextPlan) {
      return NextResponse.json({ error: 'Ответь на все три вопроса ретроспективы' }, { status: 400 });
    }

    const accessLevel = body.parentAccessLevel === undefined ? null : cleanParentAccessLevel(body.parentAccessLevel);
    if (body.parentAccessLevel !== undefined && !accessLevel) {
      return NextResponse.json({ error: 'Неверный уровень доступа родителей' }, { status: 400 });
    }

    const { updated, accessChanged } = await prisma.$transaction(async (tx) => {
      const updatedWeek = await tx.week.update({
        where: { id: weekId },
        data: { retroSuccess, retroBlockers, retroNextPlan, isSubmitted: true },
      });

      let changed = 0;
      if (accessLevel) {
        const res = await tx.parentStudentLink.updateMany({
          where: { studentId, accessLevel: { not: accessLevel } },
          data: { accessLevel },
        });
        changed = res.count;
      }
      return { updated: updatedWeek, accessChanged: changed };
    });

    if (accessChanged > 0 && accessLevel) {
      await audit({
        ...auditActor(auth.ctx),
        action: 'PARENT_ACCESS_CHANGED',
        targetType: 'USER',
        targetId: studentId,
        details: `Доступ семьи: ${ACCESS_LABEL[accessLevel]} (связей: ${accessChanged})`,
      });
    }

    return NextResponse.json({ success: true, week: updated, message: 'Воскресная ретроспектива сохранена' });
  } catch (error) {
    return handleApiError('weeks/retro', error, 'Не удалось сохранить ретроспективу');
  }
}
