import { cookies } from 'next/headers';
import prisma from './prisma';
import { User, Role } from '@prisma/client';

export interface SafeUser {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: Role;
  gradeLevel: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    gradeLevel: user.gradeLevel,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function isUserGodmode(user: { role: Role; username?: string | null; email?: string | null } | null): boolean {
  if (!user) return false;
  return user.role === Role.ADMIN || user.username === 'somi' || user.email === 'somi@mezon.uz';
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mezon_user_id')?.value;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) return sanitizeUser(user);
    }

    // Unauthenticated: DO NOT default to fake data
    return null;
  } catch (error: any) {
    if (error?.digest === 'HANGING_PROMISE_REJECTION' || error?.digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function getAllDemoUsers(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { fullName: 'asc' },
    ],
  });
  return users.map(sanitizeUser);
}
