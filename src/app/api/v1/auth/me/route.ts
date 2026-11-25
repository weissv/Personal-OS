import { NextRequest, NextResponse } from 'next/server';
import { attachSessionCookie, getSessionContext, isUserGodmode, issueSessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const ctx = await getSessionContext(req);
  if (!ctx) {
    return NextResponse.json({ user: null, isGodmode: false, isImpersonating: false }, { status: 401 });
  }

  // Скользящая сессия: продлеваем на год при активном использовании (и обновляем формат токена)
  const token = await issueSessionToken(ctx.user.id, ctx.realAdmin?.id);

  const response = NextResponse.json({
    user: ctx.user,
    isGodmode: isUserGodmode(ctx.user) || !!ctx.realAdmin,
    isImpersonating: ctx.isImpersonating,
    realAdmin: ctx.realAdmin ? { id: ctx.realAdmin.id, fullName: ctx.realAdmin.fullName } : null,
    token,
  });
  response.headers.set('Cache-Control', 'no-store');
  return attachSessionCookie(response, token, req);
}
