import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const currentUser = await getCurrentUser();

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        sprint: {
          include: {
            student: true,
          },
        },
        days: {
          orderBy: { dayOfWeek: 'asc' },
          include: {
            slots: {
              orderBy: [
                { orderIndex: 'asc' },
                { startTime: 'asc' },
              ],
            },
          },
        },
        mediaAssets: {
          orderBy: { createdAt: 'desc' },
        },
        mentorReview: {
          include: {
            mentor: true,
          },
        },
        parentReview: true,
      },
    });

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    // Check parent link
    const parentLink = await prisma.parentStudentLink.findFirst({
      where: { studentId: week.sprint.studentId },
    });

    // Check parent access level if current user is parent
    if (currentUser?.role === 'PARENT') {
      const accessLevel = parentLink?.accessLevel || 'REVOKED';
      if (accessLevel === 'REVOKED') {
        return NextResponse.json(
          { error: 'Ученик еще не открыл доступ к ежедневнику для родителей' },
          { status: 403 }
        );
      }
      if (accessLevel === 'SUMMARY_ONLY') {
        // Redact minute-by-minute slots, return only strategic goals and retro
        const sanitizedDays = week.days.map((day) => ({
          ...day,
          slots: day.isSelfStudy ? day.slots : [], // keep Saturday project slots, hide weekday slots
        }));
        return NextResponse.json({
          week: {
            ...week,
            days: sanitizedDays,
            parentAccessLevel: accessLevel,
          },
        });
      }
    }

    return NextResponse.json({
      week: {
        ...week,
        parentAccessLevel: parentLink?.accessLevel || 'REVOKED',
      },
    });
  } catch (error) {
    console.error('Fetch week error:', error);
    return NextResponse.json({ error: 'Failed to fetch week' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const body = await req.json();
    const { weekGoal, deadlinesEvents, notes, ideas, sketchesNote } = body;

    const updated = await prisma.week.update({
      where: { id: weekId },
      data: {
        ...(weekGoal !== undefined && { weekGoal }),
        ...(deadlinesEvents !== undefined && { deadlinesEvents }),
        ...(notes !== undefined && { notes }),
        ...(ideas !== undefined && { ideas }),
        ...(sketchesNote !== undefined && { sketchesNote }),
      },
    });

    return NextResponse.json({
      success: true,
      week: updated,
    });
  } catch (error) {
    console.error('Update week error:', error);
    return NextResponse.json({ error: 'Failed to update week' }, { status: 500 });
  }
}
