import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { sanitizeUser, isUserGodmode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const login = (body.login || body.username || body.email || '').toString().trim();
    const password = (body.password || '').toString();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Укажите логин и пароль' },
        { status: 400 }
      );
    }

    // Search by username or email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: login, mode: 'insensitive' } },
          { email: { equals: login.toLowerCase(), mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином не найден' },
        { status: 401 }
      );
    }

    // If user has a passwordHash, verify it
    if (user.passwordHash) {
      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Неверный пароль' },
          { status: 401 }
        );
      }
    } else {
      // If legacy user without passwordHash, require Mezon13! as initial setup password
      if (password !== 'Mezon13!') {
        return NextResponse.json(
          { error: 'Неверный пароль' },
          { status: 401 }
        );
      }
    }

    const safeUser = sanitizeUser(user);
    const isGodmode = isUserGodmode(user);

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      isGodmode,
    });

    // Set authentication session cookie for 30 days
    response.cookies.set('mezon_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при входе' },
      { status: 500 }
    );
  }
}
