import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();
    const { weekId, feedback, mentorId: customMentorId } = body;

    if (!weekId || !feedback) {
      return NextResponse.json(
        { error: 'weekId and feedback are required' },
        { status: 400 }
      );
    }

    // Determine mentor ID
    let mentorId = customMentorId;
    if (!mentorId) {
      if (currentUser?.role === Role.MENTOR) {
        mentorId = currentUser.id;
      } else {
        const defaultMentor = await prisma.user.findFirst({
          where: { role: Role.MENTOR },
        });
        mentorId = defaultMentor?.id;
      }
    }

    if (!mentorId) {
      return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });
    }

    const review = await prisma.mentorReview.upsert({
      where: { weekId },
      update: {
        mentorId,
        feedback,
        signedAt: new Date(),
      },
      create: {
        weekId,
        mentorId,
        feedback,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Ревью наставника подписано и сохранено!',
    });
  } catch (error) {
    console.error('Mentor review error:', error);
    return NextResponse.json({ error: 'Failed to save mentor review' }, { status: 500 });
  }
}
