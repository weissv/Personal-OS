const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient, Role, SlotType, SlotStatus } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const timetableData = require('../scripts/timetable_data.json');

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

const studentsData = [
  // 8 класс
  { fullName: 'Мустапаев Искандер', username: 'iskander', gradeLevel: 8, email: 'iskander@mezon.uz', password: 'Mz!iska8yDj' },
  { fullName: 'Носирова Мехрибону', username: 'mehribonu', gradeLevel: 8, email: 'mehribonu@mezon.uz', password: 'Mz!mehr92no' },
  { fullName: 'Рахимбердиев Хуршид', username: 'khurshid', gradeLevel: 8, email: 'khurshid@mezon.uz', password: 'Mz!khuryfJG' },
  { fullName: 'Туляганов Мухаммадали', username: 'muhammadali', gradeLevel: 8, email: 'muhammadali@mezon.uz', password: 'Mz!muhaPmS4' },
  { fullName: 'Шомуродова Зебунисо', username: 'zebuniso', gradeLevel: 8, email: 'zebuniso@mezon.uz', password: 'Mz!zebu4BXW' },
  { fullName: 'Эльвишаи Камаль', username: 'kamal', gradeLevel: 8, email: 'kamal@mezon.uz', password: 'Mz!kamaT9bD' },
  // 9 класс
  { fullName: 'Бахромов Феруз', username: 'feruz', gradeLevel: 9, email: 'feruz@mezon.uz', password: 'Mz!feruarjG' },
  { fullName: 'Курбонова Сафия', username: 'safiya', gradeLevel: 9, email: 'safiya@mezon.uz', password: 'Mz!safi4E8D' },
  { fullName: 'Мухамедов Батырхан', username: 'batyrkhan', gradeLevel: 9, email: 'batyrkhan@mezon.uz', password: 'Mz!batymYBh' },
  { fullName: 'Саъдуллаева Маржона', username: 'marjona', gradeLevel: 9, email: 'marjona@mezon.uz', password: 'Mz!marjrZJD' },
  { fullName: 'Турсунова Халида', username: 'khalida', gradeLevel: 9, email: 'khalida@mezon.uz', password: 'Mz!khalievn' },
  { fullName: 'Хикматуллаев Абдуворис', username: 'abduvoris', gradeLevel: 9, email: 'abduvoris@mezon.uz', password: 'Mz!abduiraC' },
];

async function main() {
  console.log('Seeding Mezon Sprint OS database with production users & timetable...');

  // Clean existing data
  await prisma.parentReview.deleteMany();
  await prisma.mentorReview.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.daySlot.deleteMany();
  await prisma.day.deleteMany();
  await prisma.week.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.timetableSlot.deleteMany();
  await prisma.user.deleteMany();

  // 0. Create GODMODE Admin (Somi)
  const somiPasswordHash = hashPassword('Mezon13!');
  const somi = await prisma.user.create({
    data: {
      username: 'somi',
      email: 'somi@mezon.uz',
      passwordHash: somiPasswordHash,
      fullName: 'Somi (Founder · Godmode)',
      role: Role.ADMIN,
    },
  });
  console.log('Created Admin Somi:', somi.id);

  // 1. Create Curators
  for (const c of curators) {
    const pwdHash = hashPassword(c.password);
    const curator = await prisma.user.create({
      data: {
        username: c.username,
        email: c.email,
        passwordHash: pwdHash,
        fullName: c.fullName,
        role: c.role,
        gradeLevel: c.gradeLevel,
      },
    });
    console.log(`Created Curator ${curator.fullName} (@${curator.username}, ${curator.gradeLevel} класс)`);
  }

  // 2. Create Timetable Templates
  for (const grade of [8, 9]) {
    const gSlots = timetableData[String(grade)] || [];
    for (const s of gSlots) {
      await prisma.timetableSlot.create({
        data: {
          gradeLevel: grade,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title,
          orderIndex: s.orderIndex,
        },
      });
    }
  }
  console.log('Created 92 TimetableSlots');

  // 3. Create Students and Sprints with Lessons
  const now = new Date();
  const currentYear = now.getFullYear();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const sprintStart = new Date(now.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
  sprintStart.setHours(0, 0, 0, 0);

  for (const st of studentsData) {
    const pwdHash = hashPassword(st.password);
    const user = await prisma.user.create({
      data: {
        fullName: st.fullName,
        username: st.username,
        email: st.email,
        passwordHash: pwdHash,
        role: Role.STUDENT,
        gradeLevel: st.gradeLevel,
      },
    });

    const sprint = await prisma.sprint.create({
      data: {
        studentId: user.id,
        title: `1 четверть ${currentYear}-${currentYear + 1} (${st.gradeLevel} класс)`,
        startDate: sprintStart,
        endDate: new Date(sprintStart.getTime() + 10 * 7 * 24 * 60 * 60 * 1000 - 1),
        weeksTotal: 10,
      },
    });

    const gradeSlots = timetableData[String(st.gradeLevel)] || [];

    for (let w = 1; w <= 10; w++) {
      const weekStart = new Date(sprintStart.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      const week = await prisma.week.create({
        data: {
          sprintId: sprint.id,
          weekNumber: w,
          startDate: weekStart,
          endDate: weekEnd,
          weekGoal: w === 1 ? 'Адаптация к четверти и фокус на ключевых предметах' : null,
        },
      });

      for (let d = 1; d <= 7; d++) {
        const dayDate = new Date(weekStart.getTime() + (d - 1) * 24 * 60 * 60 * 1000);
        const day = await prisma.day.create({
          data: {
            weekId: week.id,
            date: dayDate,
            dayOfWeek: d,
            isSelfStudy: d === 6,
          },
        });

        if (d >= 1 && d <= 5) {
          const dayLessons = gradeSlots.filter((s) => s.dayOfWeek === d);
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
          }
        }
      }
    }

    console.log(`Created student ${st.fullName} with 10 weeks of timetable lessons`);
  }

  console.log(`\nAll users and timetable seeded successfully! Total users: 15 (1 Admin + 2 Curators + 12 Students)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
