const crypto = require('crypto');
const { PrismaClient, Role, SlotType, SlotStatus, ParentAccessLevel } = require('@prisma/client');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Seeding Mezon Sprint OS database...');

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
  const defaultPasswordHash = hashPassword('Mezon13!');

  const somi = await prisma.user.create({
    data: {
      username: 'somi',
      email: 'somi@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Somi (Founder · Godmode)',
      role: Role.ADMIN,
    },
  });

  // 1. Create Curator / Mentor
  const mentor = await prisma.user.create({
    data: {
      username: 'curator',
      email: 'curator@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Малика Камалова',
      role: Role.MENTOR,
      gradeLevel: 9,
    },
  });

  // 2. Create Students
  // Student 1: Davron (Exemplary Student Agency)
  const davron = await prisma.user.create({
    data: {
      username: 'davron',
      email: 'davron@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Даврон Рахимов',
      role: Role.STUDENT,
      gradeLevel: 9,
    },
  });

  // Student 2: Leila (Red flag: High Migrations > 50%)
  const leila = await prisma.user.create({
    data: {
      username: 'leila',
      email: 'leila@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Лейла Каримова',
      role: Role.STUDENT,
      gradeLevel: 9,
    },
  });

  // Student 3: Sardor (Red flags: Silent Retro < 10 chars & Empty Self-Study)
  const sardor = await prisma.user.create({
    data: {
      username: 'sardor',
      email: 'sardor@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Сардор Умаров',
      role: Role.STUDENT,
      gradeLevel: 9,
    },
  });

  // 3. Create Parent for Davron
  const parentDavron = await prisma.user.create({
    data: {
      username: 'parent',
      email: 'parent.davron@mezon.uz',
      passwordHash: defaultPasswordHash,
      fullName: 'Азиз Рахимов',
      role: Role.PARENT,
    },
  });

  await prisma.parentStudentLink.create({
    data: {
      studentId: davron.id,
      parentId: parentDavron.id,
      accessLevel: ParentAccessLevel.SUMMARY_ONLY,
    },
  });

  console.log('Users created: Somi (ADMIN/GODMODE), Mentor, 3 Students, 1 Parent');

  // Timetable template (Ghost Slots) for Monday to Friday
  const timetableTemplates = {
    1: [ // Monday
      { startTime: '08:30', endTime: '09:15', title: 'Алгебра и мат. анализ' },
      { startTime: '09:25', endTime: '10:10', title: 'Физика (Оптика)' },
      { startTime: '10:25', endTime: '11:10', title: 'Английский язык (Academic Writing)' },
      { startTime: '11:30', endTime: '12:15', title: 'Узбекский язык и литература' },
      { startTime: '12:25', endTime: '13:10', title: 'История' },
      { startTime: '14:00', endTime: '14:45', title: 'Информатика и алгоритмы' },
      { startTime: '15:00', endTime: '16:00', title: 'Проектная лаборатория Mezon' },
    ],
    2: [ // Tuesday
      { startTime: '08:30', endTime: '09:15', title: 'Геометрия' },
      { startTime: '09:25', endTime: '10:10', title: 'Химия (Лабораторный практикум)' },
      { startTime: '10:25', endTime: '11:10', title: 'Английский язык (Debate Club)' },
      { startTime: '11:30', endTime: '12:15', title: 'Биология' },
      { startTime: '12:25', endTime: '13:10', title: 'Литература' },
      { startTime: '14:00', endTime: '15:30', title: 'Спорт / Баскетбол' },
    ],
    3: [ // Wednesday
      { startTime: '08:30', endTime: '09:15', title: 'Алгебра' },
      { startTime: '09:25', endTime: '10:10', title: 'Физика' },
      { startTime: '10:25', endTime: '11:10', title: 'Всемирная история' },
      { startTime: '11:30', endTime: '12:15', title: 'Английский язык' },
      { startTime: '12:25', endTime: '13:10', title: 'География' },
      { startTime: '14:00', endTime: '15:00', title: 'Наставнический час с куратором' },
    ],
    4: [ // Thursday
      { startTime: '08:30', endTime: '09:15', title: 'Геометрия' },
      { startTime: '09:25', endTime: '10:10', title: 'Химия' },
      { startTime: '10:25', endTime: '11:10', title: 'Информатика' },
      { startTime: '11:30', endTime: '12:15', title: 'Русский язык и риторика' },
      { startTime: '12:25', endTime: '13:10', title: 'Экономика и предпринимательство' },
      { startTime: '14:00', endTime: '15:30', title: 'Студия дизайна и прототипирования' },
    ],
    5: [ // Friday
      { startTime: '08:30', endTime: '09:15', title: 'Алгебра' },
      { startTime: '09:25', endTime: '10:10', title: 'Физика (Семинар)' },
      { startTime: '10:25', endTime: '11:10', title: 'Английский язык (IELTS prep)' },
      { startTime: '11:30', endTime: '12:15', title: 'Обществознание' },
      { startTime: '12:25', endTime: '13:10', title: 'Биология' },
      { startTime: '14:00', endTime: '15:30', title: 'Mezon Pitch Friday (Демо-день)' },
    ],
  };

  // Helper to generate 10 weeks of a sprint
  const sprintStartDate = new Date(2026, 8, 1); // 1 Sep 2026 (Tuesday)
  // Align to Monday of that week
  const baseMonday = new Date(2026, 7, 31); // 31 Aug 2026 is Monday
  const sprintEndDate = new Date(baseMonday.getTime() + 10 * 7 * 24 * 60 * 60 * 1000);

  const students = [
    { user: davron, archetype: 'exemplary' },
    { user: leila, archetype: 'high_migrations' },
    { user: sardor, archetype: 'silent_retro' },
  ];

  for (const { user, archetype } of students) {
    const sprint = await prisma.sprint.create({
      data: {
        studentId: user.id,
        title: '1 четверть 2026-2027 (Осенний спринт)',
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        weeksTotal: 10,
      },
    });

    for (let w = 1; w <= 10; w++) {
      const weekStart = new Date(baseMonday.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      // Weekly strategic parameters
      let weekGoal = `Освоить базовый блок 1 четверти (Неделя ${w})`;
      let deadlinesEvents = `Контрольная по математике в четверг, сдача черновика проекта в субботу`;
      let retroSuccess = null;
      let retroBlockers = null;
      let retroNextPlan = null;
      let isSubmitted = false;

      if (w <= 2) {
        // Completed weeks
        isSubmitted = true;
        if (archetype === 'exemplary') {
          retroSuccess = 'Полностью закрыл лабораторную по оптике, договорился со студсоветом насчет дебатов и провел 3 часа в субботу за сборкой прототипа теплицы.';
          retroBlockers = 'Задержался со статьей для академического письма из-за перегрузки в четверг; перенес финальную редактуру на субботу.';
          retroNextPlan = 'Заранее разбивать большие эссе на 2 микро-слота по 25 минут и сразу фиксировать Definition of Done утром.';
        } else if (archetype === 'high_migrations') {
          retroSuccess = 'Сдала контрольную по химии на отлично.';
          retroBlockers = 'Перенесла 6 задач из 9, потому что набрала слишком много докладов и не рассчитала время после школы.';
          retroNextPlan = 'Буду брать не больше 2 ключевых задач в день вместо 5.';
        } else if (archetype === 'silent_retro') {
          // Silent retro red flag! Under 10 characters!
          retroSuccess = 'Норм';
          retroBlockers = 'Все ок';
          retroNextPlan = 'Ничего';
        }
      } else if (w === 3) {
        // Current active week!
        weekGoal = 'Фокус на физике (линзы) и подготовка к субботнему проектному спринту';
        deadlinesEvents = 'Ср: дедлайн лабораторной, Сб: защита первой итерации прототипа';
      }

      let notes = null;
      let ideas = null;
      let sketchesNote = null;

      if (w === 3 && archetype === 'exemplary') {
        notes = '1) Взять справочник по геометрической оптике в школьной библиотеке.\n2) Согласовать с учителем физики доступ в лабораторию в субботу.';
        ideas = '[Идея 1] Использовать ультразвуковой датчик уровня воды вместо поплавкового для гидропоники.\n[Идея 2] Предложить тему дебатов на пятницу: «ИИ в школьном образовании».';
        sketchesNote = 'Принципиальная схема автополива: резервуар -> помпа 12V -> драйвер MOSFET -> ESP32 -> датчик емкостной влажности v1.2.';
      }

      const week = await prisma.week.create({
        data: {
          sprintId: sprint.id,
          weekNumber: w,
          startDate: weekStart,
          endDate: weekEnd,
          weekGoal,
          deadlinesEvents,
          notes,
          ideas,
          sketchesNote,
          retroSuccess,
          retroBlockers,
          retroNextPlan,
          isSubmitted,
        },
      });

      // Add Mentor review for completed week 1 for Davron
      if (w === 1 && archetype === 'exemplary') {
        await prisma.mentorReview.create({
          data: {
            weekId: week.id,
            mentorId: mentor.id,
            feedback: 'Отличный уровень субъектности, Даврон! Definition of Done сформулирован очень четко. Обрати внимание на отдых в субботу вечером.',
          },
        });

        await prisma.parentReview.create({
          data: {
            weekId: week.id,
            comment: 'Вижу, как Даврон увлечен проектом теплицы. Горжусь его дисциплиной и самостоятельностью!',
          },
        });
      }

      // Generate 7 Days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(weekStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const dayOfWeek = dayOffset + 1; // 1 (Mon) .. 7 (Sun)
        const isSelfStudy = dayOfWeek === 6; // Saturday

        const day = await prisma.day.create({
          data: {
            weekId: week.id,
            date: currentDate,
            dayOfWeek,
            isSelfStudy,
          },
        });

        // Populate slots
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // Monday to Friday
          const templates = timetableTemplates[dayOfWeek] || [];
          for (let sIdx = 0; sIdx < templates.length; sIdx++) {
            const tmpl = templates[sIdx];
            let isGhost = true;
            let status = SlotStatus.PENDING;
            let taskGoal = null;
            let deliverable = null;

            if (w < 3) {
              // Past weeks: mostly converted and executed
              isGhost = false;
              if (archetype === 'high_migrations' && sIdx % 3 !== 0) {
                // High migrations: over 60% of tasks migrated due to overload!
                status = SlotStatus.MIGRATED;
                taskGoal = 'Подготовка к уроку и доп. упражнения';
                deliverable = 'Перенесено из-за дебатов и перегрузки';
              } else if (archetype === 'silent_retro' && sIdx >= 4) {
                status = SlotStatus.DROPPED;
                taskGoal = 'Сделать домашку';
                deliverable = 'Отменено';
              } else {
                status = SlotStatus.DONE;
                taskGoal = `Активная работа на уроке ${tmpl.title}`;
                deliverable = `Конспект и проверенное задание`;
              }
            } else if (w === 3 && dayOfWeek === 1) {
              // Current week Monday (today / active morning flow)
              if (sIdx === 0) {
                isGhost = false;
                status = SlotStatus.DONE;
                taskGoal = 'Повторение формул тригонометрии';
                deliverable = 'Решены 4 задачи повышенной сложности';
              } else if (sIdx === 1) {
                isGhost = false;
                status = SlotStatus.PENDING;
                taskGoal = 'Лабораторная по оптике: дифракционная решетка';
                deliverable = 'Сдать черновик отчета учителю физики';
              } else if (sIdx === 2) {
                // Active slot with DoD
                isGhost = false;
                status = SlotStatus.PENDING;
                taskGoal = 'Аргументы для эссе "Dewey and Agency"';
                deliverable = 'Список из 3 ключевых тезисов в Notion';
              } else {
                // Remaining are Ghost slots (faded outline ready to be activated!)
                isGhost = true;
                status = SlotStatus.PENDING;
              }
            }

            await prisma.daySlot.create({
              data: {
                dayId: day.id,
                startTime: tmpl.startTime,
                endTime: tmpl.endTime,
                title: tmpl.title,
                type: SlotType.ACADEMIC_LESSON,
                isGhost,
                taskGoal,
                deliverable,
                status,
                orderIndex: sIdx,
              },
            });
          }

          // Add custom events for Davron
          if (w === 3 && dayOfWeek === 1 && archetype === 'exemplary') {
            await prisma.daySlot.create({
              data: {
                dayId: day.id,
                startTime: '13:15',
                endTime: '13:50',
                title: 'Большая перемена: встреча со студсоветом',
                type: SlotType.CUSTOM_EVENT,
                isGhost: false,
                taskGoal: 'Обсудить сценарий с Амиром',
                deliverable: 'Утвержден таймлайн ярмарки проектов',
                status: SlotStatus.DONE,
                orderIndex: 99,
              },
            });
          }
        } else if (dayOfWeek === 6) {
          // Saturday Self-Study Sprint
          if (w <= 2 && archetype !== 'silent_retro') {
            await prisma.daySlot.create({
              data: {
                dayId: day.id,
                startTime: '10:00',
                endTime: '12:30',
                title: 'Проект Mezon: "Умная гидропонная теплица"',
                type: SlotType.SELF_STUDY,
                isGhost: false,
                taskGoal: 'Собрать схему датчиков влажности и pH на Arduino',
                deliverable: 'Работающий стенд, показания выводятся в консоль',
                status: SlotStatus.DONE,
                orderIndex: 0,
              },
            });
            await prisma.daySlot.create({
              data: {
                dayId: day.id,
                startTime: '13:30',
                endTime: '15:00',
                title: 'Олимпиадная физика: оптика и волновые явления',
                type: SlotType.SELF_STUDY,
                isGhost: false,
                taskGoal: 'Прорешать 5 сложных задач с прошлогодней олимпиады',
                deliverable: 'Разобранные решения в тетради',
                status: SlotStatus.DONE,
                orderIndex: 1,
              },
            });
          } else if (w === 3 && archetype === 'exemplary') {
            // Prepared Saturday self-study slots for current week
            await prisma.daySlot.create({
              data: {
                dayId: day.id,
                startTime: '10:00',
                endTime: '13:00',
                title: 'Автономный проект: Тестирование насоса автополива',
                type: SlotType.SELF_STUDY,
                isGhost: false,
                taskGoal: 'Калибровка датчика потока воды и реле',
                deliverable: 'Видеозапись успешного срабатывания цикла полива',
                status: SlotStatus.PENDING,
                orderIndex: 0,
              },
            });
          }
          // Note: for Sardor (archetype === 'silent_retro'), Saturday remains completely empty!
          // This triggers the 🟡 Empty Self-Study red flag!
        }
      }

      // Add sample media assets to Davron's week 1 & 3
      if (archetype === 'exemplary' && (w === 1 || w === 3)) {
        await prisma.mediaAsset.create({
          data: {
            weekId: week.id,
            fileUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
            fileType: 'image/webp',
            fileName: 'sketch-optics-experiment.webp',
            fileSize: 245100,
            note: 'Эскиз оптической схемы: интерференция на двух щелях и замеры расстояний',
          },
        });

        await prisma.mediaAsset.create({
          data: {
            weekId: week.id,
            fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
            fileType: 'image/webp',
            fileName: 'lab-circuit-draft.webp',
            fileSize: 312400,
            note: 'Чертеж разводки датчиков влажности почвы для субботнего спринта',
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
