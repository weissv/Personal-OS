import { NextResponse } from 'next/server';
import { clearedCookieOptions, SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', clearedCookieOptions);
  // Чистим cookie прежних версий приложения
  response.cookies.set('mezon_user_id', '', { path: '/', maxAge: 0 });
  response.cookies.set('mezon_godmode_real_id', '', { path: '/', maxAge: 0 });
  return response;
}
