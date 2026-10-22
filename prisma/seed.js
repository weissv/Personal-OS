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
  console.log('Seeding Mezon Sprint OS database with production users...');

  // Clean existing data
  await prisma.parentReview.deleteMany();
  await prisma.mentorReview.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.daySlot.deleteMany();
  await prisma.day.deleteMany();
  await prisma.week.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.parentStudentLink.deleteMany();
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

  // 1. Create real students and 10-week sprint for each
  const now = new Date();
  const currentYear = now.getFullYear();
  // Monday of current week
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
        await prisma.day.create({
          data: {
            weekId: week.id,
            date: dayDate,
            dayOfWeek: d,
            isSelfStudy: d === 6,
          },
        });
      }
    }

    console.log(`Created student ${st.fullName} (@${st.username}, ${st.gradeLevel} класс)`);
  }

  console.log(`\nAll users seeded successfully! Total users: 13 (1 Admin + 12 Students)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
