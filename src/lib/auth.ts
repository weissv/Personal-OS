import { cookies } from 'next/headers';
import prisma from './prisma';
import { User, Role } from '@prisma/client';

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('mezon_user_id')?.value;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) return user;
    }

    // Default to Davron Rakhimov (exemplary 9th grade student)
    const defaultUser = await prisma.user.findFirst({
      where: { email: 'davron@mezon.uz' },
    });

    return defaultUser;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
}

export async function getAllDemoUsers() {
  return prisma.user.findMany({
    orderBy: [
      { role: 'asc' },
      { fullName: 'asc' },
    ],
  });
}
