import { NextResponse } from 'next/server';
import { getSessionContext, isUserGodmode } from '@/lib/auth';


export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ user: null, isGodmode: false, isImpersonating: false }, { status: 401 });
  }
  return NextResponse.json({
    user: ctx.user,
    isGodmode: isUserGodmode(ctx.user) || !!ctx.realAdmin,
    isImpersonating: ctx.isImpersonating,
    realAdmin: ctx.realAdmin ? { id: ctx.realAdmin.id, fullName: ctx.realAdmin.fullName } : null,
  });
}
