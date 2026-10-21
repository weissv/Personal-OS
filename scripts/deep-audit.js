const { PrismaClient, Role, SlotType, SlotStatus, ParentAccessLevel } = require('@prisma/client');
const prisma = new PrismaClient();

async function runComprehensiveAudit() {
  console.log('========================================');
  console.log('   MEZON SPRINT OS: DEEP SYSTEM AUDIT   ');
  console.log('========================================\n');

  // 1. Database schema and counts
  console.log('--- 1. DATABASE ENTITY COUNTS ---');
  const userCount = await prisma.user.count();
  const sprintCount = await prisma.sprint.count();
  const weekCount = await prisma.week.count();
  const dayCount = await prisma.day.count();
  const slotCount = await prisma.daySlot.count();
  const mediaCount = await prisma.mediaAsset.count();
  const mentorReviews = await prisma.mentorReview.count();
  const parentReviews = await prisma.parentReview.count();
  const parentLinks = await prisma.parentStudentLink.count();

  console.log({
    Users: userCount,
    Sprints: sprintCount,
    Weeks: weekCount,
    Days: dayCount,
    DaySlots: slotCount,
    MediaAssets: mediaCount,
    MentorReviews: mentorReviews,
    ParentReviews: parentReviews,
    ParentStudentLinks: parentLinks,
  });

  // 2. Validate Users and Archetypes
  console.log('\n--- 2. USERS AND ARCHETYPES ---');
  const users = await prisma.user.findMany({
    orderBy: { role: 'asc' },
  });
  for (const u of users) {
    console.log(`- [${u.role}] ${u.fullName} (${u.email}) | Grade: ${u.gradeLevel || 'N/A'}`);
  }

  // 3. Validate Sprints and Time Quantum Structure
  console.log('\n--- 3. 10-WEEK SPRINT STRUCTURE ---');
  const davron = await prisma.user.findFirst({ where: { email: 'davron@mezon.uz' } });
  const davronSprint = await prisma.sprint.findFirst({
    where: { studentId: davron.id },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          days: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      },
    },
  });

  console.log(`Sprint: "${davronSprint.title}" for ${davron.fullName}`);
  console.log(`Total Weeks: ${davronSprint.weeks.length}`);
  for (const w of davronSprint.weeks) {
    const saturday = w.days.find((d) => d.dayOfWeek === 6);
    const sunday = w.days.find((d) => d.dayOfWeek === 7);
    console.log(
      `  Week ${w.weekNumber}: Days: ${w.days.length} | Submitted: ${w.isSubmitted} | Goal: "${w.weekGoal?.substring(0, 30)}..." | Sat self-study flag: ${saturday?.isSelfStudy}`
    );
  }

  // 4. Validate Timetable Grid vs Ghost Slots vs Custom Events
  console.log('\n--- 4. SLOTS INTEGRITY CHECK ---');
  const currentWeek = davronSprint.weeks.find((w) => w.weekNumber === 3);
  const monday = currentWeek.days.find((d) => d.dayOfWeek === 1);
  const mondaySlots = await prisma.daySlot.findMany({
    where: { dayId: monday.id },
    orderBy: [{ orderIndex: 'asc' }, { startTime: 'asc' }],
  });

  console.log(`Week 3 Monday slots (${mondaySlots.length} total):`);
  let ghostCount = 0;
  let activeCount = 0;
  let customCount = 0;
  for (const s of mondaySlots) {
    if (s.isGhost) ghostCount++;
    else activeCount++;
    if (s.type === SlotType.CUSTOM_EVENT) customCount++;
    console.log(
      `  [${s.startTime || '??'}-${s.endTime || '??'}] ${s.title} | Status: ${s.status} | Ghost: ${s.isGhost} | DoD: ${s.deliverable || '—'}`
    );
  }
  console.log(`  -> Ghost slots: ${ghostCount}, Active: ${activeCount}, Custom events: ${customCount}`);

  // 5. Validate Saturday Self-Study Sprint
  console.log('\n--- 5. SATURDAY SELF-STUDY INTEGRITY ---');
  const saturday = currentWeek.days.find((d) => d.dayOfWeek === 6);
  const satSlots = await prisma.daySlot.findMany({
    where: { dayId: saturday.id },
  });
  console.log(`Saturday date: ${saturday.date.toISOString().split('T')[0]}, isSelfStudy: ${saturday.isSelfStudy}`);
  console.log(`Saturday project slots count: ${satSlots.length}`);
  for (const s of satSlots) {
    console.log(`  - ${s.title} | Type: ${s.type} | DoD: "${s.deliverable}"`);
  }

  // 6. Validate Curator Red Flags calculation logic
  console.log('\n--- 6. CURATOR RED FLAGS VERIFICATION ---');
  const allStudents = await prisma.user.findMany({
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

  for (const st of allStudents) {
    const sp = st.sprints[0];
    let totalTasks = 0;
    let migratedTasks = 0;
    let maxEmptySatStreak = 0;
    let consecutiveEmptySat = 0;
    let silentRetro = false;

    for (const w of sp.weeks) {
      const nonGhost = w.days.flatMap((d) => d.slots).filter((s) => !s.isGhost);
      for (const slot of nonGhost) {
        totalTasks++;
        if (slot.status === SlotStatus.MIGRATED) migratedTasks++;
      }
      const sat = w.days.find((d) => d.dayOfWeek === 6);
      const satActive = sat?.slots.filter((s) => !s.isGhost) || [];
      if (w.isSubmitted || w.weekNumber < 3) {
        if (satActive.length === 0) {
          consecutiveEmptySat++;
          if (consecutiveEmptySat > maxEmptySatStreak) maxEmptySatStreak = consecutiveEmptySat;
        } else {
          consecutiveEmptySat = 0;
        }
      }
      if (w.isSubmitted) {
        for (const ans of [w.retroSuccess, w.retroBlockers, w.retroNextPlan]) {
          if (ans && ans.trim().length > 0 && ans.trim().length < 10) {
            silentRetro = true;
          }
        }
      }
    }

    const migrationRate = totalTasks > 0 ? Math.round((migratedTasks / totalTasks) * 100) : 0;
    console.log(`Student: ${st.fullName} (${st.email}):`);
    console.log(`  - Migration rate: ${migrationRate}% (${migratedTasks}/${totalTasks}) -> High Migrations Flag: ${migrationRate >= 50}`);
    console.log(`  - Empty Saturday streak: ${maxEmptySatStreak} wks -> Empty Self-Study Flag: ${maxEmptySatStreak >= 2}`);
    console.log(`  - Silent Retro Flag: ${silentRetro}`);
  }

  // 7. Validate Selective Trust RBAC
  console.log('\n--- 7. SELECTIVE TRUST RBAC INTEGRITY ---');
  const links = await prisma.parentStudentLink.findMany({
    include: { student: true, parent: true },
  });
  for (const l of links) {
    console.log(
      `Link: Student ${l.student.fullName} <-> Parent ${l.parent.fullName} | Access Level: ${l.accessLevel}`
    );
  }

  console.log('\n========================================');
  console.log('   DEEP AUDIT COMPLETED SUCCESSFULLY!   ');
  console.log('========================================');
}

runComprehensiveAudit()
  .catch((e) => {
    console.error('Audit failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
