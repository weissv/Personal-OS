import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticate } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { Role, SlotStatus, SlotType } from '@prisma/client';
import { ALL_TIMETABLE_SLOTS } from '@/lib/timetable-data';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate({ admin: true });
    if (!auth.ok) return auth.response;

    // 1. Ensure Curators
    const curators = [
      {
        fullName: 'Тамилла',
        username: 'tamilla',
        email: 'tamilla@mezon.uz',
        role: Role.MENTOR,
        gradeLevel: 8,
        password: 'Mz!tami7PqX',
      },
      {
        fullName: 'Феруза',
        username: 'feruza',
        email: 'feruza@mezon.uz',
        role: Role.MENTOR,
        gradeLevel: 9,
        password: 'Mz!feru9LkZ',
      },
    ];

    for (const c of curators) {
      const pwdHash = hashPassword(c.password);
      await prisma.user.upsert({
        where: { email: c.email },
        update: {
          username: c.username,
          fullName: c.fullName,
          role: c.role,
          gradeLevel: c.gradeLevel,
          passwordHash: pwdHash,
          isActive: true,
        },
        create: {
          username: c.username,
          email: c.email,
          fullName: c.fullName,
          role: c.role,
          gradeLevel: c.gradeLevel,
          passwordHash: pwdHash,
          isActive: true,
        },
      });
    }

    // 2. Synchronize TimetableSlot templates
    await prisma.timetableSlot.deleteMany({
      where: { gradeLevel: { in: [8, 9] } },
    });

    for (const slot of ALL_TIMETABLE_SLOTS) {
      await prisma.timetableSlot.create({
        data: {
          gradeLevel: slot.gradeLevel,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: slot.title,
          orderIndex: slot.orderIndex,
        },
      });
    }

    // 3. Populate student DaySlots for weeks 1..10
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      include: {
        sprints: {
          include: {
            weeks: {
              include: {
                days: {
                  include: { slots: true },
                },
              },
            },
          },
        },
      },
    });

    let totalSlotsPopulated = 0;

    for (const st of students) {
      const grade = st.gradeLevel || 9;
      const gradeSlots = ALL_TIMETABLE_SLOTS.filter((s) => s.gradeLevel === grade);
      const sprint = st.sprints[0];
      if (!sprint) continue;

      for (const week of sprint.weeks) {
        for (const day of week.days) {
          if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
            // Check if day has no slots or only empty
            if (day.slots.length === 0) {
              const dayLessons = gradeSlots.filter((s) => s.dayOfWeek === day.dayOfWeek);
              for (const l of dayLessons) {
                await prisma.daySlot.create({
                  data: {
                    dayId: day.id,
                    startTime: l.startTime,
                    endTime: l.endTime,
                    title: l.title,
                    type: SlotType.ACADEMIC_LESSON,
                    isGhost: true,
                    status: SlotStatus.PENDING,
                    orderIndex: l.orderIndex,
                  },
                });
                totalSlotsPopulated++;
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      curatorsCount: curators.length,
      timetableSlotsCount: ALL_TIMETABLE_SLOTS.length,
      totalSlotsPopulated,
    });
  } catch (error) {
    console.error('Failed to sync school data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
