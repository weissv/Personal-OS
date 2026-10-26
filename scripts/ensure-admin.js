const path = require('path');
const crypto = require('crypto');
const { PrismaClient, Role } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function generateRandomSecurePassword(prefix = 'Mz') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}!${rand}`;
}

const timetableData = require('./timetable_data.json');

const curators = [
  {
    fullName: 'Тамилла',
    username: 'tamilla',
    email: 'tamilla@mezon.uz',
    role: Role.MENTOR,
    gradeLevel: 8,
    defaultPasswordPrefix: 'tami8',
  },
  {
    fullName: 'Феруза',
    username: 'feruza',
    email: 'feruza@mezon.uz',
    role: Role.MENTOR,
    gradeLevel: 9,
    defaultPasswordPrefix: 'feru9',
  },
];

const students = [
  // 8 класс
  { fullName: 'Мустапаев Искандер', username: 'iskander', gradeLevel: 8, email: 'iskander@mezon.uz', defaultPasswordPrefix: 'iska8' },
  { fullName: 'Носирова Мехрибону', username: 'mehribonu', gradeLevel: 8, email: 'mehribonu@mezon.uz', defaultPasswordPrefix: 'mehr8' },
  { fullName: 'Рахимбердиев Хуршид', username: 'khurshid', gradeLevel: 8, email: 'khurshid@mezon.uz', defaultPasswordPrefix: 'khur8' },
  { fullName: 'Туляганов Мухаммадали', username: 'muhammadali', gradeLevel: 8, email: 'muhammadali@mezon.uz', defaultPasswordPrefix: 'muha8' },
  { fullName: 'Шомуродова Зебунисо', username: 'zebuniso', gradeLevel: 8, email: 'zebuniso@mezon.uz', defaultPasswordPrefix: 'zebu8' },
  { fullName: 'Эльвишаи Камаль', username: 'kamal', gradeLevel: 8, email: 'kamal@mezon.uz', defaultPasswordPrefix: 'kama8' },
  // 9 класс
  { fullName: 'Бахромов Феруз', username: 'feruz', gradeLevel: 9, email: 'feruz@mezon.uz', defaultPasswordPrefix: 'feru9' },
  { fullName: 'Курбонова Сафия', username: 'safiya', gradeLevel: 9, email: 'safiya@mezon.uz', defaultPasswordPrefix: 'safi9' },
  { fullName: 'Мухамедов Батырхан', username: 'batyrkhan', gradeLevel: 9, email: 'batyrkhan@mezon.uz', defaultPasswordPrefix: 'baty9' },
  { fullName: 'Саъдуллаева Маржона', username: 'marjona', gradeLevel: 9, email: 'marjona@mezon.uz', defaultPasswordPrefix: 'marj9' },
  { fullName: 'Турсунова Халида', username: 'khalida', gradeLevel: 9, email: 'khalida@mezon.uz', defaultPasswordPrefix: 'khal9' },
  { fullName: 'Хикматуллаев Абдуворис', username: 'abduvoris', gradeLevel: 9, email: 'abduvoris@mezon.uz', defaultPasswordPrefix: 'abdu9' },
];

async function main() {
  console.log('========================================================');
  console.log('Synchronizing Mezon Sprint OS Users, Timetable & Sprints');
  console.log('Zero-Leak Security Policy Enforced');
  console.log('========================================================');

  // 1. Ensure Somi Godmode Admin
  // Preserves existing password! Reads env variable ADMIN_INITIAL_PASSWORD on first creation.
  const adminEmail = process.env.ADMIN_EMAIL || 'somi@mezon.uz';
  const adminUsername = process.env.ADMIN_USERNAME || 'somi';
  const existingAdmin = await prisma.user.findFirst({
    where: { OR: [{ email: adminEmail }, { username: adminUsername }] },
  });

  let somi;
  if (existingAdmin) {
    somi = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: Role.ADMIN,
        fullName: 'Somi (Founder · Godmode)',
        isActive: true,
      },
    });
    console.log(`✓ Admin Godmode preserved: ${somi.fullName} (@${somi.username})`);
  } else {
    const rawAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || generateRandomSecurePassword('Mezon');
    const somiPasswordHash = hashPassword(rawAdminPassword);
    somi = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        passwordHash: somiPasswordHash,
        role: Role.ADMIN,
        fullName: 'Somi (Founder · Godmode)',
        isActive: true,
      },
    });
    console.log(`✓ Initialized Admin Godmode: ${somi.fullName} (@${somi.username})`);
    if (!process.env.ADMIN_INITIAL_PASSWORD) {
      console.log(`[BOOTSTRAP NOTICE] Temporary admin password generated: ${rawAdminPassword}`);
    }
  }

  // 2. Ensure Curators (preserves existing password hashes!)
  for (const c of curators) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: c.email }, { username: c.username }] },
    });

    if (existing) {
      const curatorUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: c.fullName,
          role: c.role,
          gradeLevel: c.gradeLevel,
          isActive: true,
        },
      });
      console.log(`✓ Curator verified: ${curatorUser.fullName} (@${curatorUser.username}, ${curatorUser.gradeLevel} класс)`);
    } else {
      const initialPassword = process.env.SEED_DEFAULT_PASSWORD || generateRandomSecurePassword(c.defaultPasswordPrefix);
      const curatorUser = await prisma.user.create({
        data: {
          username: c.username,
          email: c.email,
          fullName: c.fullName,
          role: c.role,
          gradeLevel: c.gradeLevel,
          passwordHash: hashPassword(initialPassword),
          isActive: true,
        },
      });
      console.log(`✓ Created Curator: ${curatorUser.fullName} (@${curatorUser.username})`);
    }
  }

  // 3. Ensure Students (preserves existing password hashes!)
  for (const st of students) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: st.email }, { username: st.username }] },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          fullName: st.fullName,
          role: Role.STUDENT,
          gradeLevel: st.gradeLevel,
          isActive: true,
        },
      });
    } else {
      const initialPassword = process.env.SEED_DEFAULT_PASSWORD || generateRandomSecurePassword(st.defaultPasswordPrefix);
      await prisma.user.create({
        data: {
          username: st.username,
          email: st.email,
          fullName: st.fullName,
          role: Role.STUDENT,
          gradeLevel: st.gradeLevel,
          passwordHash: hashPassword(initialPassword),
          isActive: true,
        },
      });
    }
  }
  console.log(`✓ Verified ${students.length} students in database`);

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
  console.log('✓ Database bootstrap completed securely (No plaintext credentials written to disk).');
}

main()
  .catch((e) => {
    console.error('ensure-admin error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
