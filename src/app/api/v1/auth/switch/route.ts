import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getCurrentUser, sanitizeUser, isUserGodmode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, revertToAdmin } = body;

    const cookieStore = await cookies();
    const currentUserId = cookieStore.get('mezon_user_id')?.value;
    const realAdminId = cookieStore.get('mezon_godmode_real_id')?.value;

    // Handle return to Godmode
    if (revertToAdmin) {
      const targetAdminId = realAdminId || currentUserId;
      if (!targetAdminId) {
        return NextResponse.json({ error: 'No admin session found' }, { status: 400 });
      }
      const admin = await prisma.user.findUnique({ where: { id: targetAdminId } });
      if (!admin || !isUserGodmode(admin)) {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }

      const response = NextResponse.json({ success: true, user: sanitizeUser(admin), isGodmode: true });
      response.cookies.set('mezon_user_id', admin.id, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
      response.cookies.set('mezon_godmode_real_id', '', {
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    // Verify permission: only Godmode/Admin or an ongoing impersonation session can switch users
    const hasGodmodePower = isUserGodmode(currentUser) || !!realAdminId;
    if (!hasGodmodePower) {
      return NextResponse.json({ error: 'Only administrators can switch user posture' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const effectiveAdminId = realAdminId || (currentUser ? currentUser.id : null);

    const response = NextResponse.json({
      success: true,
      user: sanitizeUser(targetUser),
      isImpersonating: effectiveAdminId !== targetUser.id,
    });

    response.cookies.set('mezon_user_id', targetUser.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    if (effectiveAdminId && effectiveAdminId !== targetUser.id) {
      response.cookies.set('mezon_godmode_real_id', effectiveAdminId, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to switch user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
