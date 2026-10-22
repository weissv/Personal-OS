import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { cleanEmail, cleanGrade, cleanName, cleanPassword, cleanUsername } from '@/lib/validation';
import { audit } from '@/lib/audit';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate({ admin: true });
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.user;

    const { id } = await context.params;

    if (id === admin.id) {
      return NextResponse.json({ error: 'Нельзя удалить собственный аккаунт Godmode' }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    if (userToDelete.username === 'somi') {
      return NextResponse.json({ error: 'Запрещено удалять главного администратора somi' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await audit({
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'USER_DELETED',
      targetType: 'USER',
      targetId: id,
      targetName: userToDelete.fullName,
      details: `Удален пользователь ${userToDelete.fullName} (@${userToDelete.username})`,
    });

    return NextResponse.json({ success: true, message: 'Пользователь удален' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate({ admin: true });
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.user;

    const { id } = await context.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    const auditDetails: string[] = [];

    if (body.fullName !== undefined) {
      const name = cleanName(body.fullName);
      if (!name) return NextResponse.json({ error: 'Некорректное имя' }, { status: 400 });
      data.fullName = name;
      auditDetails.push(`ФИО: ${name}`);
    }

    if (body.email !== undefined) {
      const email = cleanEmail(body.email);
      if (!email) return NextResponse.json({ error: 'Некорректный email' }, { status: 400 });
      const dup = await prisma.user.findFirst({ where: { email, id: { not: id } } });
      if (dup) return NextResponse.json({ error: 'Email уже занят' }, { status: 409 });
      data.email = email;
      auditDetails.push(`Email: ${email}`);
    }

    if (body.username !== undefined) {
      const username = cleanUsername(body.username);
      if (!username) return NextResponse.json({ error: 'Некорректный логин' }, { status: 400 });
      const dup = await prisma.user.findFirst({ where: { username, id: { not: id } } });
      if (dup) return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
      data.username = username;
      auditDetails.push(`Логин: ${username}`);
    }

    if (body.gradeLevel !== undefined) {
      data.gradeLevel = cleanGrade(body.gradeLevel);
      auditDetails.push(`Класс: ${data.gradeLevel}`);
    }

    if (typeof body.isActive === 'boolean') {
      if (targetUser.username === 'somi' && !body.isActive) {
        return NextResponse.json({ error: 'Нельзя деактивировать главного администратора somi' }, { status: 400 });
      }
      data.isActive = body.isActive;
      auditDetails.push(`Активность: ${body.isActive}`);
    }

    if (body.password) {
      const pwd = cleanPassword(body.password);
      if (!pwd) return NextResponse.json({ error: 'Пароль должен быть не менее 8 символов' }, { status: 400 });
      data.passwordHash = hashPassword(pwd);
      auditDetails.push('Сброс пароля');
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    await audit({
      actorId: admin.id,
      actorName: admin.fullName,
      action: body.password ? 'USER_PASSWORD_RESET' : 'USER_UPDATED',
      targetType: 'USER',
      targetId: id,
      targetName: updated.fullName,
      details: auditDetails.join(', '),
    });

    return NextResponse.json({ success: true, user: sanitizeUser(updated) });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
