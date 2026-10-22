import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, notFoundResponse } from '@/lib/auth';

const MAX_TEXT = 5000;
const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : undefined);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const auth = await authenticate({ roles: [Role.STUDENT] }, req);
    if (!auth.ok) return auth.response;
    const { weekId } = await params;
    const body = await req.json().catch(() => ({}));

    const week = await prisma.week.findUnique({ where: { id: weekId }, include: { sprint: true } });
    if (!week) return notFoundResponse('Неделя не найдена');
    if (!(await canAccessStudent(auth.ctx, week.sprint.studentId, 'write'))) return denyResponse();

    const parentAccessLevel = body.parentAccessLevel;
    const updated = await prisma.$transaction(async (tx) => {
      const updatedWeek = await tx.week.update({
        where: { id: weekId },
        data: {
          retroSuccess: text(body.retroSuccess),
          retroBlockers: text(body.retroBlockers),
          retroNextPlan: text(body.retroNextPlan),
          isSubmitted: true,
        },
      });

      if (parentAccessLevel && Object.values(ParentAccessLevel).includes(parentAccessLevel)) {
        await tx.parentStudentLink.updateMany({
          where: { studentId: week.sprint.studentId },
          data: { accessLevel: parentAccessLevel as ParentAccessLevel },
        });
      }
      return updatedWeek;
    });

    return NextResponse.json({ success: true, week: updated, message: 'Воскресная ретроспектива сохранена' });
  } catch (error) {
    console.error('Retro submission error:', error);
    return NextResponse.json({ error: 'Не удалось сохранить ретроспективу' }, { status: 500 });
  }
}
