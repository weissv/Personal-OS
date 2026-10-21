# MEZON SPRINT OS (STUDENT AGENCY & REFLECTION ENGINE)

> **Персональная операционная система развития субъектности (Personal OS for Student Agency)** для учащихся 9-х классов школы **«Mezon Inspiring School»** (г. Ташкент).

Цифровая трансформация аналогового 10-недельного спринт-ежедневника. В основе лежит прагматистская педагогика **Джона Дьюи** (*«Образование — это сама жизнь»*) и эмпирический управленческий цикл **Колба / Деминга (PDCA: Plan $\rightarrow$ Do $\rightarrow$ Check $\rightarrow$ Act)**.

---

## 🧭 Ключевые принципы и сценарии

1. **Режим «Телефонного вакуума» (Zero-Phone School Day):**
   * Смартфоны сдаются на входе в школу (08:00) и выдаются после уроков (16:30).
   * **Day Bookends:**
     * **Утренний слот (07:30–08:15):** 60–90 секунд на постановку интенций дня (активация Ghost Slots, формулирование Definition of Done).
     * **Вечерний слот (16:45–21:00):** 5–7 минут на пакетную валидацию задач, свайп статусов (DONE, MIGRATED, DROPPED) и сброс медиа-артефактов в Media Dump.
     * **Воскресный слот (18:00–21:00):** 10–15 минут на рефлексию по трем вопросам PDCA и управление приватностью.

2. **Событийная модель (Event-First, not Timetable-First):**
   * Расписание уроков подгружается как **Ghost Slots** (фоновые заготовки с пунктирной рамкой).
   * Активация урока в 1 клик с заполнением `taskGoal` («Задачи») и `deliverable` («Definition of Done»).
   * Быстрое добавление кастомных событий (перемены, студсовет, спорт, лаборатория).

3. **Субботний проектный спринт (Self-Study Sprint):**
   * Полная автономность от школьных звонков.
   * Структура: «Что делаю» $\rightarrow$ «Время (ч:мин)» $\rightarrow$ «Артефакт / DoD».
   * Встроенный таймер глубокого фокуса (Deep Work, 90 минут).

4. **Суверенная модель приватности подростка (Selective Trust RBAC):**
   * Доступ родителей строго контролируется самим учеником:
     * `REVOKED`: Доступ закрыт.
     * `SUMMARY_ONLY`: Видны только глобальные цели недели, субботний проект и рефлексия (без поминутного лога).
     * `FULL_ACCESS`: Полный доступ ко всем слотам.

5. **Мультимодальный скетчбук (Media Dump):**
   * **Фото:** Клиентское сжатие через HTML5 Canvas API в WebP (макс. 1920px, качество 0.82) со сжатием на 90–93%.
   * **Аудио:** Запись Opus через MediaRecorder API (32 kbps mono, лимит 120 секунд с таймером и плеером).
   * Архитектура Pre-signed URLs для Cloudflare R2 / S3.

6. **Панель Куратора (Mentor Red Flags Panel):**
   * Автоматический расчет зон риска:
     * 🔴 **High Migrations:** ученик перенес более 50% задач за спринт (сигнал перегрузки).
     * 🟡 **Empty Self-Study:** субботний блок пуст 2 недели подряд.
     * ⚪ **Silent Retro:** ретроспектива содержит отписки менее 10 символов («норм», «ок»).
   * Форма обратной связи наставника и электронная подпись спринта (`signedAt`).

---

## 🛠 Стек технологий

* **Frontend:** Next.js 16 (App Router), TypeScript, TailwindCSS, Lucide Icons.
* **Backend:** Next.js Route Handlers (REST API), TypeScript.
* **База данных и ORM:** PostgreSQL 18.4 (встроенный кластер), Prisma ORM 6.4.1.
* **Storage:** AWS SDK for S3 / Cloudflare R2 (генерация Pre-signed URLs + локальный dev-адаптер).
* **Media Processing:** Client-side HTML5 Canvas API (WebP) + MediaRecorder API (Opus).

---

## 🚀 Запуск и тестирование

### 1. Переменные окружения (`.env`)
```env
DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/mezon_sprint_os?schema=public"
JWT_SECRET="mezon-sprint-os-super-secret-jwt-key-2026"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
S3_BUCKET="mezon-sprint-media"
S3_ENDPOINT="https://r2.storage.school.mezon"
MEDIA_PUBLIC_URL="http://localhost:3000/api/v1/media/files"
```

### 2. Запуск PostgreSQL и приложения
```bash
# Запуск встроенного PostgreSQL (порт 5433)
node scripts/db-manager.js

# Синхронизация схемы и запуск сидов
npx prisma db push
node prisma/seed.js

# Запуск приложения
npm run dev
# или production
npm run build && npm run start
```

Приложение доступно по адресу: [http://localhost:3000](http://localhost:3000)

---

## 👥 Демо-пользователи в интерфейсе

В шапке сайта предусмотрен удобный **User Switcher**:
1. **Даврон Рахимов (`davron@mezon.uz`):** Ученик 9 «А» (эталон субъектности, высокий DoD, субботний проект автополива теплицы).
2. **Лейла Каримова (`leila@mezon.uz`):** Ученица 9 «А» (флаг 🔴 **High Migrations**: 58% переносов).
3. **Сардор Умаров (`sardor@mezon.uz`):** Ученик 9 «А» (флаги 🟡 **Empty Self-Study** и ⚪ **Silent Retro**).
4. **Малика Камалова (`curator@mezon.uz`):** Куратор 9 «А» (кабинет наставника, детекция рисков, подписание спринтов).
5. **Азиз Рахимов (`parent.davron@mezon.uz`):** Родитель Даврона (демонстрация Selective Trust RBAC).
