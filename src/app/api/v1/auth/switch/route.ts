import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate, sanitizeUser } from '@/lib/auth';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { audit } from '@/lib/audit';

/**
 * Имперсонация («войти как»). Только для администратора.
 *  { userId }          — войти как пользователь
 *  { revertToAdmin }   — вернуться в свой аккаунт
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true });
    if (!auth.ok) return auth.response;
    const { ctx } = auth;
    const admin = ctx.actor!;

    const body = await req.json().catch(() => ({}));

    if (body.revertToAdmin) {
      const response = NextResponse.json({ success: true, user: admin, isGodmode: true, isImpersonating: false });
      response.cookies.set(SESSION_COOKIE, createSessionToken({ u: admin.id }), sessionCookieOptions);
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

    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(target),
      isGodmode: true,
      isImpersonating: impersonating,
    });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(impersonating ? { u: target.id, a: admin.id } : { u: admin.id }),
      sessionCookieOptions
    );
    return response;
  } catch (error) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
