import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { attachSessionCookie, authenticate, handleApiError, issueSessionToken, sanitizeUser } from '@/lib/auth';
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
      if (ctx.isImpersonating) {
        await audit({
          actorId: admin.id, actorName: admin.fullName, action: 'IMPERSONATE_END',
          targetType: 'USER', targetId: ctx.user.id, targetName: ctx.user.fullName,
        });
      }
      const token = await issueSessionToken(admin.id);
      const response = NextResponse.json({ success: true, user: admin, isGodmode: true, isImpersonating: false, token });
      return attachSessionCookie(response, token, req);
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

    const token = await issueSessionToken(impersonating ? target.id : admin.id, impersonating ? admin.id : null);
    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(target),
      isGodmode: true,
      isImpersonating: impersonating,
      token,
    });
    return attachSessionCookie(response, token, req);
  } catch (error) {
    return handleApiError('auth/switch', error);
  }
}
