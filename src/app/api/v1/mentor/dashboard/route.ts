import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Role, SlotStatus } from '@prisma/client';
import { authenticate, handleApiError } from '@/lib/auth';
import { getCurrentWeekNumber, pickActiveSprint, todayUTC } from '@/lib/sprint';
import { cleanGrade } from '@/lib/validation';


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

    // Куратор параллели видит только свою параллель (Invariant I4); выбор параллели — для админа
    // и для куратора без закреплённой параллели.
    let gradeFilter: number | undefined = undefined;
    if (user.role === Role.MENTOR && user.gradeLevel != null) {
      gradeFilter = user.gradeLevel;
    } else if (requestedGrade) {
      gradeFilter = cleanGrade(requestedGrade) ?? undefined;
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
          include: {
            weeks: {
              orderBy: { weekNumber: 'asc' },
              include: {
                days: {
                  select: {
                    dayOfWeek: true,
                    slots: { select: { status: true, isGhost: true } },
                  },
                },
                mentorReview: { select: { feedback: true, signedAt: true } },
                _count: { select: { mediaAssets: true } },
              },
            },
          },
        },
      },
      orderBy: [{ gradeLevel: 'asc' }, { fullName: 'asc' }],
    });

    const today = todayUTC();
    const studentRows = students.map((student) => {
      const activeSprint = pickActiveSprint(student.sprints, today);
      const weeks = activeSprint?.weeks || [];
      const currentWeekNumber = activeSprint ? getCurrentWeekNumber(activeSprint, today) : 1;

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
        const weekIsOver = week.endDate < today;
        if (week.isSubmitted || weekIsOver) {
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

      const currentWeek = weeks.find((w) => w.weekNumber === currentWeekNumber) || weeks[0];

      return {
        student: {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          gradeLevel: student.gradeLevel,
        },
        activeSprint: activeSprint
          ? { id: activeSprint.id, title: activeSprint.title, weeksTotal: activeSprint.weeksTotal }
          : null,
        currentWeekNumber,
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
          mediaAssetsCount: w._count.mediaAssets,
          slotsSummary: (() => {
            const active = w.days.flatMap((d) => d.slots).filter((s) => !s.isGhost);
            return {
              total: active.length,
              done: active.filter((s) => s.status === SlotStatus.DONE).length,
              migrated: active.filter((s) => s.status === SlotStatus.MIGRATED).length,
            };
          })(),
        })),
        currentWeekId: currentWeek?.id,
      };
    });

    const cohortLabel = gradeFilter ? `${gradeFilter} класс` : 'Все классы школы';

    return NextResponse.json({
      className: cohortLabel,
      gradeLevel: gradeFilter ?? null,
      canChooseGrade: !(user.role === Role.MENTOR && user.gradeLevel != null),
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
