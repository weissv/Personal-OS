import { NextResponse } from 'next/server';
import { getCurrentUser, getAllDemoUsers } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  const demoUsers = await getAllDemoUsers();

  return NextResponse.json({
    user: currentUser,
    availableUsers: demoUsers,
  });
}
