import { NextRequest, NextResponse } from 'next/server';
import { ParentAccessLevel, Prisma, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authenticate, badRequest, handleApiError, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { cleanEmail, cleanGrade, cleanName, cleanPassword, cleanUsername, PASSWORD_HINT } from '@/lib/validation';
import { audit, auditActor } from '@/lib/audit';

const ROOT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'somi';

/** Нельзя оставить школу без единого активного администратора. */
async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const others = await prisma.user.count({ where: { role: Role.ADMIN, isActive: true, id: { not: userId } } });
  return others === 0;
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.actor!;

    const { id } = await context.params;
    if (id === admin.id) return badRequest('Нельзя удалить собственный аккаунт');

    const target = await prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { mentorReviews: true } } },
    });
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    if (target.username === ROOT_ADMIN_USERNAME) return badRequest('Главного администратора удалить нельзя');
    if (target.role === Role.ADMIN && (await isLastActiveAdmin(id))) return badRequest('Это последний администратор школы');
    if (target._count.mentorReviews > 0) {
      return NextResponse.json(
        {
          error: `У куратора ${target._count.mentorReviews} подписанных ревью — удаление сотрёт историю обратной связи учеников. Отключите аккаунт вместо удаления.`,
        },
        { status: 409 }
      );
    }

    await prisma.user.delete({ where: { id } });

    await audit({
      ...auditActor(auth.ctx),
      action: 'USER_DELETED',
      targetType: 'USER',
      targetId: id,
      targetName: target.fullName,
      details: `Удалён пользователь ${target.fullName} (@${target.username}, ${target.role})`,
    });

    return NextResponse.json({ success: true, message: 'Пользователь удалён' });
  } catch (error) {
    return handleApiError('admin/users:delete', error, 'Не удалось удалить пользователя');
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.actor!;

    const { id } = await context.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const data: Prisma.UserUpdateInput = {};
    const details: string[] = [];

    if (body.fullName !== undefined) {
      const name = cleanName(body.fullName);
      if (!name) return badRequest('Некорректное имя');
      data.fullName = name;
      details.push(`ФИО: ${name}`);
    }

    if (body.email !== undefined) {
      const email = cleanEmail(body.email);
      if (!email) return badRequest('Некорректный email');
      if (await prisma.user.findFirst({ where: { email, id: { not: id } } })) {
        return NextResponse.json({ error: 'Email уже занят' }, { status: 409 });
      }
      data.email = email;
      details.push(`Email: ${email}`);
    }

    if (body.username !== undefined) {
      const username = cleanUsername(body.username);
      if (!username) return badRequest('Некорректный логин');
      if (target.username === ROOT_ADMIN_USERNAME && username !== target.username) {
        return badRequest('Логин главного администратора не меняется');
      }
      if (await prisma.user.findFirst({ where: { username, id: { not: id } } })) {
        return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
      }
      data.username = username;
      details.push(`Логин: ${username}`);
    }

    if (body.gradeLevel !== undefined) {
      const grade = body.gradeLevel === null ? null : cleanGrade(body.gradeLevel);
      if (body.gradeLevel !== null && grade === null) return badRequest('Некорректный класс');
      data.gradeLevel = grade;
      details.push(`Класс: ${grade ?? '—'}`);
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') return badRequest('isActive должен быть true/false');
      if (!body.isActive) {
        if (id === admin.id) return badRequest('Нельзя отключить собственный аккаунт');
        if (target.username === ROOT_ADMIN_USERNAME) return badRequest('Главного администратора отключить нельзя');
        if (target.role === Role.ADMIN && (await isLastActiveAdmin(id))) return badRequest('Это последний администратор школы');
      }
      data.isActive = body.isActive;
      details.push(body.isActive ? 'Аккаунт включён' : 'Аккаунт отключён');
    }

    const passwordReset = body.password !== undefined && body.password !== '';
    if (passwordReset) {
      const pwd = cleanPassword(body.password);
      if (!pwd) return badRequest(PASSWORD_HINT);
      data.passwordHash = hashPassword(pwd);
      details.push('Сброс пароля (все сессии отозваны)');
    }

    // Связи родителя с детьми: { addStudentId } / { removeStudentId }
    const addStudentId = typeof body.addStudentId === 'string' ? body.addStudentId : null;
    const removeStudentId = typeof body.removeStudentId === 'string' ? body.removeStudentId : null;
    if ((addStudentId || removeStudentId) && target.role !== Role.PARENT) return badRequest('Связи с учениками — только у родителя');
    if (addStudentId) {
      const student = await prisma.user.findUnique({ where: { id: addStudentId }, select: { role: true, fullName: true } });
      if (!student || student.role !== Role.STUDENT) return badRequest('Ученик не найден');
      // Ученик уже выбрал уровень доступа для семьи — новый родитель получает тот же
      const sibling = await prisma.parentStudentLink.findFirst({ where: { studentId: addStudentId }, select: { accessLevel: true } });
      data.studentLinks = {
        connectOrCreate: {
          where: { studentId_parentId: { studentId: addStudentId, parentId: id } },
          create: { studentId: addStudentId, accessLevel: sibling?.accessLevel ?? ParentAccessLevel.REVOKED }, // I2: решает ученик
        },
      };
      details.push(`Привязан ребёнок: ${student.fullName}`);
    }
    if (removeStudentId) {
      data.studentLinks = { ...(data.studentLinks as object), deleteMany: { studentId: removeStudentId } };
      details.push('Связь с ребёнком удалена');
    }

    if (details.length === 0) return badRequest('Нет изменений');

    const updated = await prisma.user.update({ where: { id }, data });

    await audit({
      ...auditActor(auth.ctx),
      action: passwordReset ? 'USER_PASSWORD_RESET' : body.isActive === false ? 'USER_DEACTIVATED' : 'USER_UPDATED',
      targetType: 'USER',
      targetId: id,
      targetName: updated.fullName,
      details: details.join(', '),
    });

    return NextResponse.json({ success: true, user: sanitizeUser(updated) });
  } catch (error) {
    return handleApiError('admin/users:update', error, 'Не удалось обновить пользователя');
  }
}
