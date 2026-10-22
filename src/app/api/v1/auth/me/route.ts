import { NextRequest, NextResponse } from 'next/server';
import { getSessionContext, isUserGodmode } from '@/lib/auth';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

export async function GET(req: NextRequest) {
  const ctx = await getSessionContext(req);
  if (!ctx) {
    return NextResponse.json({ user: null, isGodmode: false, isImpersonating: false }, { status: 401 });
  }

  // Продлеваем сессию на 1 год при активном использовании
  const token = createSessionToken(
    ctx.realAdmin ? { u: ctx.user.id, a: ctx.realAdmin.id } : { u: ctx.user.id }
  );

  const response = NextResponse.json({
    user: ctx.user,
    isGodmode: isUserGodmode(ctx.user) || !!ctx.realAdmin,
    isImpersonating: ctx.isImpersonating,
    realAdmin: ctx.realAdmin ? { id: ctx.realAdmin.id, fullName: ctx.realAdmin.fullName } : null,
    token,
  });

  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
  return response;
}

