import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get('studentId');

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetStudentId = requestedStudentId;

    if (!targetStudentId) {
      if (currentUser.role === 'STUDENT') {
        targetStudentId = currentUser.id;
      } else if (currentUser.role === 'PARENT') {
        const link = await prisma.parentStudentLink.findFirst({
          where: { parentId: currentUser.id },
        });
        targetStudentId = link?.studentId || null;
      } else {
        // Mentor or admin: pick active student
        const firstStudent = await prisma.user.findFirst({
          where: { role: 'STUDENT' },
          orderBy: { fullName: 'asc' },
        });
        targetStudentId = firstStudent?.id || null;
      }
    }

    if (!targetStudentId) {
      return NextResponse.json({ sprint: null, parentAccessLevel: 'REVOKED' });
    }

    const sprint = await prisma.sprint.findFirst({
      where: { studentId: targetStudentId },
      include: {
        student: true,
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: {
            mentorReview: true,
            parentReview: true,
            _count: {
              select: {
                mediaAssets: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sprint) {
      return NextResponse.json({ sprint: null, parentAccessLevel: 'REVOKED' });
    }

    const parentLink = await prisma.parentStudentLink.findFirst({
      where: { studentId: targetStudentId },
    });

    return NextResponse.json({
      sprint,
      parentAccessLevel: parentLink?.accessLevel || 'REVOKED',
    });
  } catch (error) {
    console.error('Fetch active sprint error:', error);
    return NextResponse.json({ error: 'Failed to fetch active sprint' }, { status: 500 });
  }
}
