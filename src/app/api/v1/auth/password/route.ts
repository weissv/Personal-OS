import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { attachSessionCookie, authenticate, handleApiError, issueSessionToken } from '@/lib/auth';
import { hashPassword, verifyPassword } from '@/lib/password';
import { cleanPassword, PASSWORD_HINT } from '@/lib/validation';
import { audit } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Смена собственного пароля. Недоступна в режиме имперсонации.
 * Все остальные сессии пользователя отзываются; текущая перевыпускается.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({}, req);
    if (!auth.ok) return auth.response;
    const { ctx } = auth;

    if (ctx.isImpersonating) {
      return NextResponse.json({ error: 'В режиме «войти как» менять пароль нельзя' }, { status: 403 });
    }
    if (!rateLimit(`pwd:${ctx.user.id}`, 5, 15 * 60 * 1000).allowed) {
      return NextResponse.json({ error: 'Слишком много попыток. Повторите позже.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const current = String(body.currentPassword ?? '');
    const next = cleanPassword(body.newPassword);
    if (!next) return NextResponse.json({ error: PASSWORD_HINT }, { status: 400 });
    if (next === current) return NextResponse.json({ error: 'Новый пароль должен отличаться от текущего' }, { status: 400 });

    const record = await prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!record || !verifyPassword(current, record.passwordHash)) {
      return NextResponse.json({ error: 'Текущий пароль указан неверно' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: record.id }, data: { passwordHash: hashPassword(next) } });
    await audit({ actorId: record.id, actorName: record.fullName, action: 'PASSWORD_CHANGED', targetType: 'USER', targetId: record.id });

    const token = await issueSessionToken(record.id);
    return attachSessionCookie(NextResponse.json({ success: true, token }), token, req);
  } catch (error) {
    return handleApiError('auth/password', error);
  }
}
