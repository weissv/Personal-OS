import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { Role, ParentAccessLevel } from '@prisma/client';
import { cleanEmail, cleanGrade, cleanName, cleanPassword, cleanUsername, PASSWORD_HINT, USERNAME_HINT } from '@/lib/validation';
import { generateSprintForStudent, todayUTC, mondayOnOrBefore } from '@/lib/sprint';
import { audit } from '@/lib/audit';


// GET /api/v1/admin/users
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role');
    const search = searchParams.get('search');

    const where: any = {};
    if (roleFilter && ['STUDENT', 'MENTOR', 'PARENT', 'ADMIN'].includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
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
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.user;

    const body = await req.json().catch(() => ({}));
    const rawFullName = cleanName(body.fullName);
    const rawUsername = cleanUsername(body.username);
    const rawEmail = cleanEmail(body.email);
    const rawPassword = cleanPassword(body.password);
    const roleInput = String(body.role || 'STUDENT').toUpperCase();
    const gradeLevel = cleanGrade(body.gradeLevel) || (roleInput === 'STUDENT' ? 9 : null);
    const studentId = body.studentId ? String(body.studentId).trim() : null;
    const accessLevelInput = String(body.accessLevel || 'SUMMARY_ONLY');

    if (!rawFullName) {
      return NextResponse.json({ error: 'Укажите корректное ФИО (от 2 до 100 символов)' }, { status: 400 });
    }
    if (!rawUsername) {
      return NextResponse.json({ error: USERNAME_HINT }, { status: 400 });
    }
    if (!rawEmail) {
      return NextResponse.json({ error: 'Укажите корректный адрес электронной почты' }, { status: 400 });
    }
    if (!rawPassword) {
      return NextResponse.json({ error: PASSWORD_HINT }, { status: 400 });
    }
    if (!['STUDENT', 'MENTOR', 'PARENT', 'ADMIN'].includes(roleInput)) {
      return NextResponse.json({ error: 'Недопустимая роль пользователя' }, { status: 400 });
    }

    // Check unique username & email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: rawUsername }, { email: rawEmail }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином или email уже существует' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(rawPassword);

    const newUser = await prisma.user.create({
      data: {
        fullName: rawFullName,
        username: rawUsername,
        email: rawEmail,
        passwordHash,
        role: roleInput as Role,
        gradeLevel: roleInput === 'STUDENT' || roleInput === 'MENTOR' ? gradeLevel : null,
      },
    });

    // If role is PARENT and studentId is provided, link to student
    if (roleInput === 'PARENT' && studentId) {
      const student = await prisma.user.findUnique({ where: { id: studentId } });
      if (student && student.role === Role.STUDENT) {
        await prisma.parentStudentLink.create({
          data: {
            studentId,
            parentId: newUser.id,
            accessLevel: accessLevelInput === 'FULL_ACCESS' ? ParentAccessLevel.FULL_ACCESS : ParentAccessLevel.SUMMARY_ONLY,
          },
        });
      }
    }

    // If role is STUDENT, automatically generate 10-week sprint using sprint generator
    if (roleInput === 'STUDENT') {
      const currentYear = new Date().getFullYear();
      const sprintTitle = `1 четверть ${currentYear}-${currentYear + 1} (${gradeLevel} класс)`;
      const startDate = mondayOnOrBefore(todayUTC());

      await generateSprintForStudent({
        studentId: newUser.id,
        gradeLevel,
        title: sprintTitle,
        startDate,
        weeksTotal: 10,
      });
    }

    await audit({
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'USER_CREATED',
      targetType: 'USER',
      targetId: newUser.id,
      targetName: newUser.fullName,
      details: `Создан пользователь ${newUser.fullName} (@${newUser.username}, роль: ${newUser.role})`,
    });

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
