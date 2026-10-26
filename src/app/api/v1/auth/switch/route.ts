import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, sanitizeUser } from '@/lib/auth';
import { createSessionToken, SESSION_COOKIE, getSessionCookieOptions } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * Имперсонация («войти как»). Только для администратора.
 *  { userId }          — войти как пользователь
 *  { revertToAdmin }   — вернуться в свой аккаунт
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const admin = ctx.actor!;

    const body = await req.json().catch(() => ({}));

    if (body.revertToAdmin) {
      const token = createSessionToken({ u: admin.id });
      const response = NextResponse.json({ success: true, user: admin, isGodmode: true, isImpersonating: false, token });
      response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
      return response;
    }

    const userId = typeof body.userId === 'string' ? body.userId : '';
    if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    if (!target.isActive) return NextResponse.json({ error: 'Аккаунт отключён' }, { status: 409 });

    const impersonating = target.id !== admin.id;
    if (impersonating) {
      await audit({
        actorId: admin.id, actorName: admin.fullName, action: 'IMPERSONATE_START',
        targetType: 'USER', targetId: target.id, targetName: target.fullName,
      });
    }

    const token = createSessionToken(impersonating ? { u: target.id, a: admin.id } : { u: admin.id });
    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(target),
      isGodmode: true,
      isImpersonating: impersonating,
      token,
    });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      getSessionCookieOptions()
    );
    return response;
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
