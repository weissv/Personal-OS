import { NextRequest, NextResponse } from 'next/server';
import { getClearedCookieOptions, SESSION_COOKIE } from '@/lib/session';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', getClearedCookieOptions(req));
  // Чистим cookie прежних версий приложения
  response.cookies.set('mezon_user_id', '', { path: '/', maxAge: 0 });
  response.cookies.set('mezon_godmode_real_id', '', { path: '/', maxAge: 0 });
  return response;
}
