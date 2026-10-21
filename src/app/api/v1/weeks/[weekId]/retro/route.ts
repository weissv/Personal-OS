import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ParentAccessLevel } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ weekId: string }> }
) {
  try {
    const { weekId } = await params;
    const body = await req.json();
    const {
      retroSuccess,
      retroBlockers,
      retroNextPlan,
      parentAccessLevel,
    } = body;

    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        sprint: true,
      },
    });

    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    // Atomic transaction to update retro and parent access level
    const updated = await prisma.$transaction(async (tx) => {
      const updatedWeek = await tx.week.update({
        where: { id: weekId },
        data: {
          retroSuccess,
          retroBlockers,
          retroNextPlan,
          isSubmitted: true,
        },
      });

      // Update parent access level if provided
      if (parentAccessLevel && Object.values(ParentAccessLevel).includes(parentAccessLevel)) {
        await tx.parentStudentLink.updateMany({
          where: { studentId: week.sprint.studentId },
          data: { accessLevel: parentAccessLevel as ParentAccessLevel },
        });
      }

      return updatedWeek;
    });

    return NextResponse.json({
      success: true,
      week: updated,
      message: 'Воскресная ретроспектива успешно сохранена!',
    });
  } catch (error) {
    console.error('Retro submission error:', error);
    return NextResponse.json(
      { error: 'Failed to update weekly retro', details: String(error) },
      { status: 500 }
    );
  }
}
