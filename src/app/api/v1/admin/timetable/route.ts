import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { cleanGrade, cleanTime } from '@/lib/validation';
import { audit } from '@/lib/audit';


// GET /api/v1/admin/timetable?grade=9
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const gradeParam = searchParams.get('grade');
    const gradeLevel = gradeParam ? cleanGrade(gradeParam) : null;

    const slots = await prisma.timetableSlot.findMany({
      where: gradeLevel ? { gradeLevel } : {},
      orderBy: [{ gradeLevel: 'asc' }, { dayOfWeek: 'asc' }, { orderIndex: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      slots,
    });
  } catch (error) {
    console.error('Failed to get timetable slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v1/admin/timetable
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.user;

    const body = await req.json().catch(() => ({}));
    const gradeLevel = cleanGrade(body.gradeLevel);
    const dayOfWeek = parseInt(body.dayOfWeek, 10);
    const startTime = cleanTime(body.startTime);
    const endTime = cleanTime(body.endTime);
    const title = String(body.title || '').trim();

    if (!gradeLevel || isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7 || !startTime || !endTime || !title) {
      return NextResponse.json(
        { error: 'Заполните все поля: параллель, день недели (1-7), время начала (ЧЧ:ММ), время конца (ЧЧ:ММ), предмет' },
        { status: 400 }
      );
    }

    const slot = await prisma.timetableSlot.create({
      data: {
        gradeLevel,
        dayOfWeek,
        startTime,
        endTime,
        title,
        orderIndex: parseInt(body.orderIndex, 10) || 0,
      },
    });

    await audit({
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'TIMETABLE_SLOT_CREATED',
      targetType: 'TIMETABLE',
      targetId: slot.id,
      details: `${gradeLevel} класс: ${title} (${startTime}-${endTime}, день: ${dayOfWeek})`,
    });

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('Failed to create timetable slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/v1/admin/timetable?id=...
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true }, req);
    if (!auth.ok) return auth.response;
    const admin = auth.ctx.user;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing slot id' }, { status: 400 });
    }

    const slot = await prisma.timetableSlot.findUnique({ where: { id } });
    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

    await prisma.timetableSlot.delete({ where: { id } });

    await audit({
      actorId: admin.id,
      actorName: admin.fullName,
      action: 'TIMETABLE_SLOT_DELETED',
      targetType: 'TIMETABLE',
      targetId: id,
      details: `Удален урок: ${slot.title} (${slot.gradeLevel} класс)`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete timetable slot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
