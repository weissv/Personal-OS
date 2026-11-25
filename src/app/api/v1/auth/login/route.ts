import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { burnPasswordCheck, verifyPassword } from '@/lib/password';
import { attachSessionCookie, handleApiError, isUserGodmode, issueSessionToken, sanitizeUser } from '@/lib/auth';
import { clientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit';
import { audit } from '@/lib/audit';

const WINDOW_MS = 15 * 60 * 1000;
const BAD_CREDENTIALS = 'Неверный логин или пароль';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const login = String(body.login ?? body.username ?? body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!login || !password || login.length > 120 || password.length > 128) {
      return NextResponse.json({ error: 'Укажите логин и пароль' }, { status: 400 });
    }

    // Защита от перебора: по IP+логину, по IP в целом и по аккаунту с любых адресов
    // (последнее не обходится ротацией IP / подделкой X-Forwarded-For).
    const ip = clientIp(req);
    const perLogin = `login:${ip}:${login}`;
    const limits = [
      rateLimit(perLogin, 5, WINDOW_MS),
      rateLimit(`login-ip:${ip}`, 30, WINDOW_MS),
      rateLimit(`login-acct:${login}`, 20, WINDOW_MS),
    ];
    if (limits.some((l) => !l.allowed)) {
      const wait = Math.max(...limits.map((l) => l.retryAfterSeconds));
      return NextResponse.json(
        { error: `Слишком много попыток входа. Повторите через ${Math.ceil(wait / 60)} мин.` },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      );
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: login }, { email: login }] },
    });

    if (!user || !user.passwordHash) {
      burnPasswordCheck(password);
      return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      await audit({ actorId: user.id, actorName: user.fullName, action: 'LOGIN_FAILED', targetType: 'USER', targetId: user.id, details: `ip=${ip}` });
      return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Аккаунт отключён. Обратитесь к администратору школы.' }, { status: 403 });
    }

    resetRateLimit(perLogin);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({ actorId: user.id, actorName: user.fullName, action: 'LOGIN', targetType: 'USER', targetId: user.id, details: `ip=${ip}` });

    const token = await issueSessionToken(user.id);
    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(user),
      isGodmode: isUserGodmode(user),
      token,
    });
    return attachSessionCookie(response, token, req);
  } catch (error) {
    return handleApiError('auth/login', error, 'Внутренняя ошибка сервера при входе');
  }
}
