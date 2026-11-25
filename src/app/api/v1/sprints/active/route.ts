import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, canAccessStudent, denyResponse, handleApiError } from '@/lib/auth';
import { getCurrentWeekNumber, pickActiveSprint } from '@/lib/sprint';


/**
 * Активный спринт ученика (для ученика — свой, для родителя — привязанного ребёнка).
 * ?studentId= доступен администратору и куратору (в пределах своей параллели).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.STUDENT, Role.PARENT, Role.MENTOR, Role.ADMIN] }, req);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    const requested = new URL(req.url).searchParams.get('studentId');
    let studentId: string | null = null;
    let reason: 'NO_LINK' | 'NO_STUDENT' | null = null;

    // Родитель может быть связан с несколькими детьми — отдаём список для переключателя
    const children =
      ctx.user.role === Role.PARENT
        ? (
            await prisma.parentStudentLink.findMany({
              where: { parentId: ctx.user.id },
              orderBy: { createdAt: 'asc' },
              select: { accessLevel: true, student: { select: { id: true, fullName: true, gradeLevel: true } } },
            })
          ).map((l) => ({ ...l.student, accessLevel: l.accessLevel }))
        : [];

    if (ctx.user.role === Role.PARENT) {
      // Свой ребёнок виден в списке всегда (даже при закрытом доступе), чужой — никогда
      const pick = requested ? children.find((c) => c.id === requested) : children[0];
      if (requested && !pick) return denyResponse();
      if (!pick) reason = 'NO_LINK';
      studentId = pick?.id ?? null;
    } else if (requested) {
      if (!(await canAccessStudent(ctx, requested, 'read'))) return denyResponse();
      studentId = requested;
    } else if (ctx.user.role === Role.STUDENT) {
      studentId = ctx.user.id;
    } else {
      reason = 'NO_STUDENT';
    }

    if (!studentId) {
      return NextResponse.json({ sprint: null, student: null, children, currentWeekNumber: null, parentAccessLevel: 'REVOKED', reason });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, gradeLevel: true },
    });

    const sprints = await prisma.sprint.findMany({
      where: { studentId },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          select: { id: true, weekNumber: true, startDate: true, endDate: true, isSubmitted: true },
        },
      },
    });
    const sprint = pickActiveSprint(sprints);

    const parentLink = await prisma.parentStudentLink.findFirst({
      where: ctx.user.role === Role.PARENT ? { studentId, parentId: ctx.user.id } : { studentId },
    });

    return NextResponse.json({
      sprint,
      student,
      children,
      currentWeekNumber: sprint ? getCurrentWeekNumber(sprint) : null,
      parentAccessLevel: parentLink?.accessLevel ?? ParentAccessLevel.REVOKED,
      reason: sprint ? null : 'NO_SPRINT',
    });
  } catch (error) {
    return handleApiError('sprints/active', error);
  }
}
