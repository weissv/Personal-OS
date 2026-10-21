import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { weekId, comment } = body;

    if (!weekId || !comment) {
      return NextResponse.json(
        { error: 'weekId and comment are required' },
        { status: 400 }
      );
    }

    const review = await prisma.parentReview.upsert({
      where: { weekId },
      update: {
        comment,
        signedAt: new Date(),
      },
      create: {
        weekId,
        comment,
        signedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      review,
      message: 'Комментарий родителя подписан и сохранен!',
    });
  } catch (error) {
    console.error('Parent review error:', error);
    return NextResponse.json({ error: 'Failed to save parent review' }, { status: 500 });
  }
}
