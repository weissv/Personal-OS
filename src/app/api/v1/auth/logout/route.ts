import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Выход выполнен' });
  response.cookies.set('mezon_user_id', '', {
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('mezon_godmode_real_id', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}
