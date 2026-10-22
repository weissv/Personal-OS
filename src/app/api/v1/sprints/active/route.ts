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
    const auth = await authenticate({ roles: [Role.STUDENT, Role.PARENT, Role.MENTOR, Role.ADMIN] });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    const requested = new URL(req.url).searchParams.get('studentId');
    let studentId: string | null = null;
    let reason: 'NO_LINK' | 'NO_STUDENT' | null = null;

    if (requested) {
      if (!(await canAccessStudent(ctx, requested, 'read'))) return denyResponse();
      studentId = requested;
    } else if (ctx.user.role === Role.STUDENT) {
      studentId = ctx.user.id;
    } else if (ctx.user.role === Role.PARENT) {
      const link = await prisma.parentStudentLink.findFirst({
        where: { parentId: ctx.user.id },
        orderBy: { createdAt: 'asc' },
      });
      if (!link) reason = 'NO_LINK';
      studentId = link?.studentId ?? null;
    } else {
      reason = 'NO_STUDENT';
    }

    if (!studentId) {
      return NextResponse.json({ sprint: null, student: null, currentWeekNumber: null, parentAccessLevel: 'REVOKED', reason });
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
      currentWeekNumber: sprint ? getCurrentWeekNumber(sprint) : null,
      parentAccessLevel: parentLink?.accessLevel ?? ParentAccessLevel.REVOKED,
      reason: sprint ? null : 'NO_SPRINT',
    });
  } catch (error) {
    return handleApiError('sprints/active', error);
  }
}
