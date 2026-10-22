import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isUserGodmode } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !isUserGodmode(user)) {
      return NextResponse.json({ error: 'Access denied: Godmode/Admin required' }, { status: 403 });
    }

    // Role breakdown
    const [studentsCount, mentorsCount, parentsCount, adminsCount] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'MENTOR' } }),
      prisma.user.count({ where: { role: 'PARENT' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    // Cohorts
    const [grade9Count, grade10Count, grade11Count] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', gradeLevel: 9 } }),
      prisma.user.count({ where: { role: 'STUDENT', gradeLevel: 10 } }),
      prisma.user.count({ where: { role: 'STUDENT', gradeLevel: 11 } }),
    ]);

    // Sprints & Weeks
    const sprintsTotal = await prisma.sprint.count();
    const weeksTotal = await prisma.week.count();
    const submittedRetrosTotal = await prisma.week.count({ where: { isSubmitted: true } });

    // Slots aggregation
    const slots = await prisma.daySlot.findMany({
      where: { isGhost: false },
      select: {
        status: true,
        type: true,
      },
    });

    const totalActiveSlots = slots.length;
    const doneSlots = slots.filter((s) => s.status === 'DONE').length;
    const migratedSlots = slots.filter((s) => s.status === 'MIGRATED').length;
    const droppedSlots = slots.filter((s) => s.status === 'DROPPED').length;
    const pendingSlots = slots.filter((s) => s.status === 'PENDING').length;

    const completionRate = totalActiveSlots > 0 ? Math.round((doneSlots / totalActiveSlots) * 100) : 0;
    const migrationRate = totalActiveSlots > 0 ? Math.round((migratedSlots / totalActiveSlots) * 100) : 0;

    // Red flag / at-risk audit: analyze student velocity
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        sprints: {
          include: {
            weeks: {
              include: {
                days: {
                  include: {
                    slots: true,
                  },
                },
                mentorReview: true,
              },
            },
          },
        },
      },
    });

    const atRiskStudents = [];

    for (const st of students) {
      const activeSprint = st.sprints[0];
      if (!activeSprint) continue;

      let studentTotalSlots = 0;
      let studentMigratedSlots = 0;
      let unsubmittedWeeks = 0;
      let emptySelfStudy = 0;

      for (const w of activeSprint.weeks) {
        if (!w.isSubmitted && w.weekNumber <= 3) {
          unsubmittedWeeks++;
        }
        for (const d of w.days) {
          const nonGhost = d.slots.filter((s) => !s.isGhost);
          studentTotalSlots += nonGhost.length;
          studentMigratedSlots += nonGhost.filter((s) => s.status === 'MIGRATED').length;

          if (d.dayOfWeek === 6 && nonGhost.length === 0) {
            emptySelfStudy++;
          }
        }
      }

      const migPct = studentTotalSlots > 0 ? Math.round((studentMigratedSlots / studentTotalSlots) * 100) : 0;
      const flags: string[] = [];

      if (migPct >= 35) {
        flags.push(`Высокий перенос задач: ${migPct}%`);
      }
      if (unsubmittedWeeks > 0) {
        flags.push(`Просрочено ретро: ${unsubmittedWeeks} нед.`);
      }
      if (emptySelfStudy > 1) {
        flags.push(`Пустая суббота: ${emptySelfStudy} раз(а)`);
      }

      if (flags.length > 0) {
        atRiskStudents.push({
          id: st.id,
          fullName: st.fullName,
          gradeLevel: st.gradeLevel || 9,
          email: st.email,
          username: st.username,
          migrationRate: migPct,
          flags,
        });
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        users: {
          students: studentsCount,
          mentors: mentorsCount,
          parents: parentsCount,
          admins: adminsCount,
          total: studentsCount + mentorsCount + parentsCount + adminsCount,
        },
        cohorts: {
          grade9: grade9Count,
          grade10: grade10Count,
          grade11: grade11Count,
        },
        slots: {
          total: totalActiveSlots,
          done: doneSlots,
          migrated: migratedSlots,
          dropped: droppedSlots,
          pending: pendingSlots,
          completionRate,
          migrationRate,
        },
        sprints: {
          total: sprintsTotal,
          weeksTotal,
          submittedRetrosTotal,
        },
        atRiskStudents,
      },
    });
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
