import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Prisma, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, badRequest, handleApiError, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import {
  cleanEmail,
  cleanGrade,
  cleanName,
  cleanParentAccessLevel,
  cleanPassword,
  cleanRole,
  cleanUsername,
  PASSWORD_HINT,
  USERNAME_HINT,
} from '@/lib/validation';
import { defaultSprintForNewStudent, generateSprintForStudent } from '@/lib/sprint';
import { audit, auditActor } from '@/lib/audit';

// GET /api/v1/admin/users?role=STUDENT&search=...
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const role = cleanRole(searchParams.get('role'));
    const search = searchParams.get('search')?.trim().slice(0, 100);

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      include: {
        sprints: { select: { id: true, title: true, weeksTotal: true } },
        parentLinks: { include: { parent: { select: { id: true, fullName: true, email: true } } } },
        studentLinks: { include: { student: { select: { id: true, fullName: true, email: true } } } },
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
    return handleApiError('admin/users:list', error);
  }
}

// POST /api/v1/admin/users — регистрация участника (ученику сразу генерируется спринт)
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const fullName = cleanName(body.fullName);
    const username = cleanUsername(body.username);
    const email = cleanEmail(body.email);
    const password = cleanPassword(body.password);
    const role = cleanRole(body.role ?? 'STUDENT');

    if (!fullName) return badRequest('Укажите корректное ФИО (от 2 до 100 символов)');
    if (!username) return badRequest(USERNAME_HINT);
    if (!email) return badRequest('Укажите корректный адрес электронной почты');
    if (!password) return badRequest(PASSWORD_HINT);
    if (!role) return badRequest('Недопустимая роль пользователя');

    const needsGrade = role === Role.STUDENT || role === Role.MENTOR;
    const gradeLevel = needsGrade ? cleanGrade(body.gradeLevel) : null;
    if (role === Role.STUDENT && !gradeLevel) return badRequest('Укажите класс ученика');

    // Родитель: привязка к ученику (необязательна, но если указана — должна быть корректной)
    const studentId = role === Role.PARENT && typeof body.studentId === 'string' && body.studentId ? body.studentId : null;
    const accessLevel = cleanParentAccessLevel(body.accessLevel) ?? ParentAccessLevel.SUMMARY_ONLY;
    if (studentId) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { role: true } });
      if (!student || student.role !== Role.STUDENT) return badRequest('Выбранный ученик не найден');
    }

    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с таким логином или email уже существует' }, { status: 409 });
    }

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        email,
        passwordHash: hashPassword(password),
        role,
        gradeLevel,
        ...(studentId ? { studentLinks: { create: { studentId, accessLevel } } } : {}),
      },
    });

    let sprintInfo: Awaited<ReturnType<typeof generateSprintForStudent>> | null = null;
    if (role === Role.STUDENT) {
      try {
        const plan = await defaultSprintForNewStudent(gradeLevel);
        sprintInfo = await generateSprintForStudent({ studentId: newUser.id, gradeLevel, ...plan });
      } catch (e) {
        // Без спринта ученик бесполезен: откатываем создание, чтобы не оставлять «полуаккаунт»
        await prisma.user.delete({ where: { id: newUser.id } }).catch(() => undefined);
        throw e;
      }
    }

    await audit({
      ...auditActor(auth.ctx),
      action: 'USER_CREATED',
      targetType: 'USER',
      targetId: newUser.id,
      targetName: newUser.fullName,
      details: `Создан пользователь ${newUser.fullName} (@${newUser.username}, роль: ${newUser.role}${
        gradeLevel ? `, ${gradeLevel} класс` : ''
      })`,
    });

    return NextResponse.json({
      success: true,
      user: sanitizeUser(newUser),
      sprint: sprintInfo,
      message: `Пользователь ${newUser.fullName} успешно зарегистрирован`,
    });
  } catch (error) {
    return handleApiError('admin/users:create', error, 'Не удалось создать пользователя');
  }
}
