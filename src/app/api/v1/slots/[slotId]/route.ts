import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SlotStatus } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    const body = await req.json();
    const { startTime, endTime, title, taskGoal, deliverable, status, isGhost } = body;

    const updated = await prisma.daySlot.update({
      where: { id: slotId },
      data: {
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(title !== undefined && { title }),
        ...(taskGoal !== undefined && { taskGoal }),
        ...(deliverable !== undefined && { deliverable }),
        ...(status !== undefined && { status: status as SlotStatus }),
        ...(isGhost !== undefined && { isGhost }),
      },
    });

    return NextResponse.json({
      success: true,
      slot: updated,
    });
  } catch (error) {
    console.error('Update slot error:', error);
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    const { slotId } = await params;
    await prisma.daySlot.delete({
      where: { id: slotId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete slot error:', error);
    return NextResponse.json({ error: 'Failed to delete slot' }, { status: 500 });
  }
}
