import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, isUserGodmode, sanitizeUser } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentUser();
    if (!admin || !isUserGodmode(admin)) {
      return NextResponse.json({ error: 'Access denied: Godmode/Admin required' }, { status: 403 });
    }

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
    const admin = await getCurrentUser();
    if (!admin || !isUserGodmode(admin)) {
      return NextResponse.json({ error: 'Access denied: Godmode/Admin required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { fullName, email, username, password, gradeLevel } = body;

    const data: any = {};
    if (fullName) data.fullName = fullName.trim();
    if (email) data.email = email.trim().toLowerCase();
    if (username) data.username = username.trim().toLowerCase();
    if (gradeLevel !== undefined) data.gradeLevel = gradeLevel ? parseInt(gradeLevel, 10) : null;
    if (password && password.trim()) {
      data.passwordHash = hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, user: sanitizeUser(updated) });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
