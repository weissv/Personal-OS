import { NextRequest, NextResponse } from 'next/server';
import { Role, SlotStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, handleApiError } from '@/lib/auth';
import { pickActiveSprint, todayUTC } from '@/lib/sprint';

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const today = todayUTC();

    const [roleGroups, gradeGroups, statusGroups, sprintsTotal, weeksTotal, submittedRetrosTotal] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.user.groupBy({ by: ['gradeLevel'], where: { role: Role.STUDENT }, _count: { _all: true } }),
      prisma.daySlot.groupBy({ by: ['status'], where: { isGhost: false }, _count: { _all: true } }),
      prisma.sprint.count(),
      prisma.week.count(),
      prisma.week.count({ where: { isSubmitted: true } }),
    ]);

    const byRole = (r: Role) => roleGroups.find((g) => g.role === r)?._count._all ?? 0;
    const byGrade = (g: number) => gradeGroups.find((x) => x.gradeLevel === g)?._count._all ?? 0;
    const byStatus = (s: SlotStatus) => statusGroups.find((x) => x.status === s)?._count._all ?? 0;

    const slotsTotal = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
    const done = byStatus(SlotStatus.DONE);
    const migrated = byStatus(SlotStatus.MIGRATED);

    // Зона риска: по активному спринту каждого ученика и только по уже прошедшим неделям
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT, isActive: true },
      select: {
        id: true,
        fullName: true,
        gradeLevel: true,
        email: true,
        username: true,
        sprints: {
          select: {
            startDate: true,
            endDate: true,
            weeks: {
              select: {
                weekNumber: true,
                endDate: true,
                isSubmitted: true,
                days: { select: { dayOfWeek: true, slots: { where: { isGhost: false }, select: { status: true } } } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const atRiskStudents = [];
    for (const st of students) {
      const sprint = pickActiveSprint(st.sprints, today);
      if (!sprint) continue;

      let total = 0;
      let migratedCount = 0;
      let overdueRetros = 0;
      let emptySaturdays = 0;

      for (const w of sprint.weeks) {
        const isOver = w.endDate < today;
        if (isOver && !w.isSubmitted) overdueRetros++;
        for (const d of w.days) {
          total += d.slots.length;
          migratedCount += d.slots.filter((s) => s.status === SlotStatus.MIGRATED).length;
          if (isOver && d.dayOfWeek === 6 && d.slots.length === 0) emptySaturdays++;
        }
      }

      const migrationRate = pct(migratedCount, total);
      const flags: string[] = [];
      if (total >= 5 && migrationRate >= 35) flags.push(`Высокий перенос задач: ${migrationRate}%`);
      if (overdueRetros > 0) flags.push(`Не сдано ретро: ${overdueRetros} нед.`);
      if (emptySaturdays > 1) flags.push(`Пустая суббота: ${emptySaturdays} нед.`);

      if (flags.length) {
        atRiskStudents.push({
          id: st.id,
          fullName: st.fullName,
          gradeLevel: st.gradeLevel,
          email: st.email,
          username: st.username,
          migrationRate,
          flags,
        });
      }
    }

    const users = {
      students: byRole(Role.STUDENT),
      mentors: byRole(Role.MENTOR),
      parents: byRole(Role.PARENT),
      admins: byRole(Role.ADMIN),
    };

    return NextResponse.json({
      success: true,
      stats: {
        users: { ...users, total: users.students + users.mentors + users.parents + users.admins },
        cohorts: { grade8: byGrade(8), grade9: byGrade(9), grade10: byGrade(10), grade11: byGrade(11) },
        slots: {
          total: slotsTotal,
          done,
          migrated,
          dropped: byStatus(SlotStatus.DROPPED),
          pending: byStatus(SlotStatus.PENDING),
          completionRate: pct(done, slotsTotal),
          migrationRate: pct(migrated, slotsTotal),
        },
        sprints: { total: sprintsTotal, weeksTotal, submittedRetrosTotal },
        atRiskStudents,
      },
    });
  } catch (error) {
    return handleApiError('admin/stats', error);
  }
}
