import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getCurrentUser, getAllDemoUsers, sanitizeUser, isUserGodmode } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({
      user: null,
      isGodmode: false,
      isImpersonating: false,
      availableUsers: [],
    });
  }

  const cookieStore = await cookies();
  const realAdminId = cookieStore.get('mezon_godmode_real_id')?.value;
  let isImpersonating = false;
  let realAdminUser = null;

  if (realAdminId && realAdminId !== currentUser.id) {
    const adminRecord = await prisma.user.findUnique({ where: { id: realAdminId } });
    if (adminRecord && isUserGodmode(adminRecord)) {
      isImpersonating = true;
      realAdminUser = sanitizeUser(adminRecord);
    }
  }

  const isGodmode = isUserGodmode(currentUser) || !!realAdminUser;
  const allUsers = isGodmode ? await getAllDemoUsers() : [];

  return NextResponse.json({
    user: currentUser,
    isGodmode,
    isImpersonating,
    realAdmin: realAdminUser,
    availableUsers: allUsers,
  });
}
