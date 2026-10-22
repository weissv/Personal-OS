const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const timetableData = require('./timetable_data.json');

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

const students = [
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
  console.log('========================================================');
  console.log('Synchronizing Mezon Sprint OS Users, Timetable & Sprints');
  console.log('========================================================');

  // 1. Ensure Somi Godmode Admin
  const somiPasswordHash = hashPassword('Mezon13!');
  const somi = await prisma.user.upsert({
    where: { email: 'somi@mezon.uz' },
    update: {
      username: 'somi',
      passwordHash: somiPasswordHash,
      role: Role.ADMIN,
      fullName: 'Somi (Founder · Godmode)',
      isActive: true,
    },
    create: {
      username: 'somi',
      email: 'somi@mezon.uz',
      passwordHash: somiPasswordHash,
      role: Role.ADMIN,
      fullName: 'Somi (Founder · Godmode)',
      isActive: true,
    },
  });
  console.log(`✓ Admin Godmode ready: ${somi.fullName} (@${somi.username})`);

  // 2. Ensure Curators
  for (const c of curators) {
    const pwdHash = hashPassword(c.password);
    const curatorUser = await prisma.user.upsert({
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
    console.log(`✓ Curator ready: ${curatorUser.fullName} (@${curatorUser.username}, ${curatorUser.gradeLevel} класс)`);
  }

  // 3. Ensure Students
  for (const st of students) {
    const pwdHash = hashPassword(st.password);
    await prisma.user.upsert({
      where: { email: st.email },
      update: {
        username: st.username,
        fullName: st.fullName,
        role: Role.STUDENT,
        gradeLevel: st.gradeLevel,
        passwordHash: pwdHash,
        isActive: true,
      },
      create: {
        username: st.username,
        email: st.email,
        fullName: st.fullName,
        role: Role.STUDENT,
        gradeLevel: st.gradeLevel,
        passwordHash: pwdHash,
        isActive: true,
      },
    });
  }
  console.log(`✓ Verified 12 students in database`);

  // 4. Synchronize TimetableSlot templates
  await prisma.timetableSlot.deleteMany({
    where: { gradeLevel: { in: [8, 9] } },
  });

  const slotsToCreate = [];
  for (const grade of [8, 9]) {
    const gSlots = timetableData[String(grade)] || [];
    for (const s of gSlots) {
      slotsToCreate.push({
        gradeLevel: grade,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        orderIndex: s.orderIndex,
      });
    }
  }

  await prisma.timetableSlot.createMany({ data: slotsToCreate });
  console.log(`✓ Synchronized ${slotsToCreate.length} timetable template slots (8 & 9 классы)`);

  // 5. Populate Sprint Weeks and DaySlots for each student
  const now = new Date();
  const currentYear = now.getFullYear();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const sprintStart = new Date(now.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
  sprintStart.setHours(0, 0, 0, 0);

  const daySlotsToBatch = [];

  for (const st of students) {
    const user = await prisma.user.findUnique({ where: { username: st.username } });
    if (!user) continue;

    let sprint = await prisma.sprint.findFirst({
      where: { studentId: user.id },
      include: {
        weeks: {
          include: {
            days: {
              include: { slots: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!sprint) {
      sprint = await prisma.sprint.create({
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

      sprint = await prisma.sprint.findUnique({
        where: { id: sprint.id },
        include: {
          weeks: {
            include: {
              days: {
                include: { slots: { select: { id: true } } },
              },
            },
          },
        },
      });
    }

    const gradeSlots = timetableData[String(user.gradeLevel)] || [];

    for (const week of sprint.weeks) {
      for (const day of week.days) {
        if (day.dayOfWeek >= 1 && day.dayOfWeek <= 5) {
          if (day.slots.length === 0) {
            const dayLessons = gradeSlots.filter((s) => s.dayOfWeek === day.dayOfWeek);
            for (const l of dayLessons) {
              daySlotsToBatch.push({
                dayId: day.id,
                startTime: l.startTime,
                endTime: l.endTime,
                title: l.title,
                type: 'ACADEMIC_LESSON',
                isGhost: true,
                status: 'PENDING',
                orderIndex: l.orderIndex,
              });
            }
          }
        }
      }
    }
  }

  if (daySlotsToBatch.length > 0) {
    await prisma.daySlot.createMany({ data: daySlotsToBatch });
  }
  console.log(`✓ Populated ${daySlotsToBatch.length} lesson slots in student diaries`);

  // 6. Generate Updated CSV
  const csvRows = [
    '№,Роль,Класс,ФИО,Юзернейм,Пароль,Email',
    '1,ADMIN,-,"Somi (Founder · Godmode)",somi,Mezon13!,somi@mezon.uz',
    '2,MENTOR,8 класс,"Тамилла (Куратор)",tamilla,Mz!tami7PqX,tamilla@mezon.uz',
    '3,MENTOR,9 класс,"Феруза (Куратор)",feruza,Mz!feru9LkZ,feruza@mezon.uz',
  ];

  let num = 4;
  for (const st of students) {
    csvRows.push(`${num},STUDENT,${st.gradeLevel} класс,"${st.fullName}",${st.username},${st.password},${st.email}`);
    num++;
  }

  const csvPath = path.join(process.cwd(), 'students_credentials.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\r\n'), 'utf8');
  console.log(`✓ Updated credentials file at ${csvPath}`);
}

main()
  .catch((e) => {
    console.error('ensure-admin error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
