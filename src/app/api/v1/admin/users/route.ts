import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isUserGodmode, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { Role, SlotType, SlotStatus, ParentAccessLevel } from '@prisma/client';

const TIMETABLE_TEMPLATES: Record<number, Array<{ startTime: string; endTime: string; title: string }>> = {
  1: [
    { startTime: '08:30', endTime: '09:15', title: 'Алгебра и мат. анализ' },
    { startTime: '09:25', endTime: '10:10', title: 'Физика (Оптика)' },
    { startTime: '10:25', endTime: '11:10', title: 'Английский язык (Academic Writing)' },
    { startTime: '11:30', endTime: '12:15', title: 'Узбекский язык и литература' },
    { startTime: '12:25', endTime: '13:10', title: 'История' },
    { startTime: '14:00', endTime: '14:45', title: 'Информатика и алгоритмы' },
    { startTime: '15:00', endTime: '16:00', title: 'Проектная лаборатория Mezon' },
  ],
  2: [
    { startTime: '08:30', endTime: '09:15', title: 'Геометрия' },
    { startTime: '09:25', endTime: '10:10', title: 'Химия (Лабораторный практикум)' },
    { startTime: '10:25', endTime: '11:10', title: 'Английский язык (Debate Club)' },
    { startTime: '11:30', endTime: '12:15', title: 'Биология' },
    { startTime: '12:25', endTime: '13:10', title: 'Литература' },
    { startTime: '14:00', endTime: '15:30', title: 'Спорт / Баскетбол' },
  ],
  3: [
    { startTime: '08:30', endTime: '09:15', title: 'Алгебра' },
    { startTime: '09:25', endTime: '10:10', title: 'Физика' },
    { startTime: '10:25', endTime: '11:10', title: 'Всемирная история' },
    { startTime: '11:30', endTime: '12:15', title: 'Английский язык' },
    { startTime: '12:25', endTime: '13:10', title: 'География' },
    { startTime: '14:00', endTime: '15:00', title: 'Наставнический час с куратором' },
  ],
  4: [
    { startTime: '08:30', endTime: '09:15', title: 'Геометрия' },
    { startTime: '09:25', endTime: '10:10', title: 'Химия' },
    { startTime: '10:25', endTime: '11:10', title: 'Информатика' },
    { startTime: '11:30', endTime: '12:15', title: 'Русский язык и риторика' },
    { startTime: '12:25', endTime: '13:10', title: 'Биология' },
    { startTime: '14:00', endTime: '15:30', title: 'Исследовательская работа' },
  ],
  5: [
    { startTime: '08:30', endTime: '09:15', title: 'Алгебра' },
    { startTime: '09:25', endTime: '10:10', title: 'Физика' },
    { startTime: '10:25', endTime: '11:10', title: 'Английский язык' },
    { startTime: '11:30', endTime: '12:15', title: 'Литература' },
    { startTime: '12:25', endTime: '13:10', title: 'Искусство и дизайн' },
    { startTime: '14:00', endTime: '15:00', title: 'Сборка итогов недели' },
  ],
};

// GET /api/v1/admin/users
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !isUserGodmode(user)) {
      return NextResponse.json({ error: 'Access denied: Godmode/Admin required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {};
    if (roleFilter && ['STUDENT', 'MENTOR', 'PARENT', 'ADMIN'].includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      include: {
        sprints: {
          select: {
            id: true,
            title: true,
            weeksTotal: true,
          },
        },
        parentLinks: {
          include: {
            parent: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        studentLinks: {
          include: {
            student: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        ...sanitizeUser(u),
        sprintsCount: u.sprints.length,
        sprints: u.sprints,
        parents: u.parentLinks.map((l) => ({ ...l.parent, accessLevel: l.accessLevel })),
        students: u.studentLinks.map((l) => ({ ...l.student, accessLevel: l.accessLevel })),
      })),
    });
  } catch (error) {
    console.error('Failed to list users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/users
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !isUserGodmode(admin)) {
      return NextResponse.json({ error: 'Access denied: Godmode/Admin required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      fullName,
      username,
      email,
      password,
      role = 'STUDENT',
      gradeLevel = 9,
      studentId, // For PARENT role: link to student
      accessLevel = 'SUMMARY_ONLY',
    } = body;

    if (!fullName || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля: ФИО, логин, email, пароль' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check unique username & email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином или email уже существует' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const parsedGrade = gradeLevel ? parseInt(gradeLevel, 10) : 9;

    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: role as Role,
        gradeLevel: role === 'STUDENT' || role === 'MENTOR' ? parsedGrade : null,
      },
    });

    // If role is PARENT and studentId is provided, link to student
    if (role === 'PARENT' && studentId) {
      await prisma.parentStudentLink.create({
        data: {
          studentId,
          parentId: newUser.id,
          accessLevel: (accessLevel as ParentAccessLevel) || ParentAccessLevel.SUMMARY_ONLY,
        },
      });
    }

    // If role is STUDENT, automatically generate their Sprint, 10 Weeks, Days and Timetable Slots
    if (role === 'STUDENT') {
      const sprintStartDate = new Date(2026, 8, 1); // Sept 1, 2026
      const sprintEndDate = new Date(2026, 10, 8); // Nov 8, 2026

      const sprint = await prisma.sprint.create({
        data: {
          studentId: newUser.id,
          title: `1 четверть 2026-2027 (${parsedGrade} класс)`,
          startDate: sprintStartDate,
          endDate: sprintEndDate,
          weeksTotal: 10,
        },
      });

      // Generate 10 weeks
      for (let w = 1; w <= 10; w++) {
        const weekStart = new Date(2026, 8, 1 + (w - 1) * 7);
        const weekEnd = new Date(2026, 8, 7 + (w - 1) * 7);

        const week = await prisma.week.create({
          data: {
            sprintId: sprint.id,
            weekNumber: w,
            startDate: weekStart,
            endDate: weekEnd,
            weekGoal: w === 1 ? 'Адаптация и запуск траектории' : `Освоение программы недели ${w}`,
          },
        });

        // 7 days per week
        for (let d = 1; d <= 7; d++) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + (d - 1));

          const isSelfStudy = d === 6;

          const day = await prisma.day.create({
            data: {
              weekId: week.id,
              date: dayDate,
              dayOfWeek: d,
              isSelfStudy,
            },
          });

          // Monday-Friday: Academic slots
          if (d >= 1 && d <= 5) {
            const lessons = TIMETABLE_TEMPLATES[d] || [];
            for (let i = 0; i < lessons.length; i++) {
              const l = lessons[i];
              await prisma.daySlot.create({
                data: {
                  dayId: day.id,
                  startTime: l.startTime,
                  endTime: l.endTime,
                  title: l.title,
                  type: SlotType.ACADEMIC_LESSON,
                  isGhost: false,
                  status: SlotStatus.PENDING,
                  orderIndex: i,
                },
              });
            }
          } else if (d === 6) {
            // Saturday: 2 self-study slots
            await prisma.daySlot.createMany({
              data: [
                {
                  dayId: day.id,
                  startTime: '10:00',
                  endTime: '12:00',
                  title: 'Проектный хакатон Mezon',
                  type: SlotType.SELF_STUDY,
                  isGhost: false,
                  status: SlotStatus.PENDING,
                  orderIndex: 0,
                },
                {
                  dayId: day.id,
                  startTime: '13:00',
                  endTime: '15:00',
                  title: 'Индивидуальная траектория и исследования',
                  type: SlotType.SELF_STUDY,
                  isGhost: false,
                  status: SlotStatus.PENDING,
                  orderIndex: 1,
                },
              ],
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: sanitizeUser(newUser),
      message: `Пользователь ${newUser.fullName} успешно зарегистрирован`,
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
