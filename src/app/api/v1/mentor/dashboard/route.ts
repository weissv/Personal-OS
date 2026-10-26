import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role, SlotStatus } from '@prisma/client';
import { authenticate, handleApiError } from '@/lib/auth';
import { getCurrentWeekNumber } from '@/lib/sprint';


export interface StudentRedFlags {
  highMigrations: boolean;
  emptySelfStudy: boolean;
  silentRetro: boolean;
  migrationRate: number; // percentage
  totalTasks: number;
  migratedTasks: number;
  emptySelfStudyWeeksCount: number;
  silentRetroSnippet?: string;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ roles: [Role.MENTOR, Role.ADMIN] }, req);
    if (!auth.ok) return auth.response;

    const { user } = auth.ctx;
    const url = new URL(req.url);
    const requestedGrade = url.searchParams.get('grade');

    let gradeFilter: number | undefined = undefined;
    if (requestedGrade && !isNaN(Number(requestedGrade))) {
      gradeFilter = Number(requestedGrade);
    } else if (user.role === Role.MENTOR && user.gradeLevel) {
      gradeFilter = user.gradeLevel;
    }

    const whereClause: { role: Role; gradeLevel?: number } = {
      role: Role.STUDENT,
      ...(gradeFilter ? { gradeLevel: gradeFilter } : {}),
    };

    // 1. Fetch students for the mentor's cohort
    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        sprints: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                days: {
                  include: {
                    slots: true,
                  },
                },
                mentorReview: true,
                parentReview: true,
                mediaAssets: true,
              },
            },
          },
        },
      },
      orderBy: [{ gradeLevel: 'asc' }, { fullName: 'asc' }],
    });

    const studentRows = students.map((student) => {
      const activeSprint = student.sprints[0];
      const weeks = activeSprint?.weeks || [];

      // Calculate statistics across all active/submitted weeks
      let totalTasks = 0;
      let completedTasks = 0;
      let migratedTasks = 0;
      let droppedTasks = 0;
      let consecutiveEmptySelfStudy = 0;
      let maxEmptySelfStudyStreak = 0;
      let hasSilentRetro = false;
      let silentRetroSnippet = '';

      for (const week of weeks) {
        const allSlots = week.days.flatMap((d) => d.slots).filter((s) => !s.isGhost);
        for (const slot of allSlots) {
          totalTasks++;
          if (slot.status === SlotStatus.DONE) completedTasks++;
          if (slot.status === SlotStatus.MIGRATED) migratedTasks++;
          if (slot.status === SlotStatus.DROPPED) droppedTasks++;
        }

        const saturday = week.days.find((d) => d.dayOfWeek === 6);
        const satSlots = saturday?.slots.filter((s) => !s.isGhost) || [];
        if (week.isSubmitted || week.weekNumber < 3) {
          if (satSlots.length === 0) {
            consecutiveEmptySelfStudy++;
            if (consecutiveEmptySelfStudy > maxEmptySelfStudyStreak) {
              maxEmptySelfStudyStreak = consecutiveEmptySelfStudy;
            }
          } else {
            consecutiveEmptySelfStudy = 0;
          }
        }

        if (week.isSubmitted) {
          const answers = [week.retroSuccess, week.retroBlockers, week.retroNextPlan];
          for (const ans of answers) {
            if (ans && ans.trim().length > 0 && ans.trim().length < 10) {
              hasSilentRetro = true;
              silentRetroSnippet = `Неделя ${week.weekNumber}: "${ans.trim()}"`;
              break;
            }
          }
        }
      }

      const migrationRate = totalTasks > 0 ? Math.round((migratedTasks / totalTasks) * 100) : 0;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const flags: StudentRedFlags = {
        highMigrations: migrationRate >= 50,
        emptySelfStudy: maxEmptySelfStudyStreak >= 2,
        silentRetro: hasSilentRetro,
        migrationRate,
        totalTasks,
        migratedTasks,
        emptySelfStudyWeeksCount: maxEmptySelfStudyStreak,
        silentRetroSnippet: silentRetroSnippet || undefined,
      };

      const targetWeekNumber = activeSprint ? getCurrentWeekNumber(activeSprint) : 1;
      const currentWeek = weeks.find((w) => w.weekNumber === targetWeekNumber) || weeks[0];

      return {
        student: {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          gradeLevel: student.gradeLevel,
        },
        activeSprint: {
          id: activeSprint?.id,
          title: activeSprint?.title,
          weeksTotal: activeSprint?.weeksTotal,
        },
        flags,
        metrics: {
          totalTasks,
          completedTasks,
          migratedTasks,
          droppedTasks,
          completionRate,
          migrationRate,
        },
        weeks: weeks.map((w) => ({
          id: w.id,
          weekNumber: w.weekNumber,
          isSubmitted: w.isSubmitted,
          weekGoal: w.weekGoal,
          retroSuccess: w.retroSuccess,
          retroBlockers: w.retroBlockers,
          retroNextPlan: w.retroNextPlan,
          hasMentorReview: !!w.mentorReview,
          mentorFeedback: w.mentorReview?.feedback,
          signedAt: w.mentorReview?.signedAt,
          mediaAssetsCount: w.mediaAssets.length,
          slotsSummary: {
            total: w.days.flatMap((d) => d.slots).filter((s) => !s.isGhost).length,
            done: w.days.flatMap((d) => d.slots).filter((s) => s.status === 'DONE').length,
            migrated: w.days.flatMap((d) => d.slots).filter((s) => s.status === 'MIGRATED').length,
          },
        })),
        currentWeekId: currentWeek?.id,
      };
    });

    const cohortLabel = gradeFilter ? `${gradeFilter} класс` : 'Все классы школы';

    return NextResponse.json({
      className: cohortLabel,
      studentsCount: studentRows.length,
      redFlagsSummary: {
        highMigrationsCount: studentRows.filter((r) => r.flags.highMigrations).length,
        emptySelfStudyCount: studentRows.filter((r) => r.flags.emptySelfStudy).length,
        silentRetroCount: studentRows.filter((r) => r.flags.silentRetro).length,
      },
      students: studentRows,
    });
  } catch (error) {
    return handleApiError('mentor/dashboard', error);
  }
}
