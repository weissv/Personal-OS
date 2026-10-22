'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationHeader, ViewMode, AppUser } from '@/components/NavigationHeader';
import { MorningFocusView } from '@/components/MorningFocusView';
import { EveningDebriefView } from '@/components/EveningDebriefView';
import { SaturdaySelfStudyView } from '@/components/SaturdaySelfStudyView';
import { WeeklyRetroView } from '@/components/WeeklyRetroView';
import { MentorDashboardView } from '@/components/MentorDashboardView';
import { ParentPortalView } from '@/components/ParentPortalView';
import { AdminGodmodeView } from '@/components/AdminGodmodeView';
import { MezonCoverView } from '@/components/MezonCoverView';
import { SprintSpine } from '@/components/SprintSpine';
import { Loading } from '@/components/ui';

interface WeekData {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weekGoal: string | null;
  deadlinesEvents: string | null;
  notes: string | null;
  ideas: string | null;
  sketchesNote: string | null;
  retroSuccess: string | null;
  retroBlockers: string | null;
  retroNextPlan: string | null;
  isSubmitted: boolean;
  parentAccessLevel: 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
  days: Array<{
    id: string;
    weekId: string;
    date: string;
    dayOfWeek: number;
    isSelfStudy: boolean;
    slots: Array<{
      id: string;
      dayId: string;
      startTime: string | null;
      endTime: string | null;
      title: string;
      type: string;
      isGhost: boolean;
      taskGoal: string | null;
      deliverable: string | null;
      status: string;
      orderIndex: number;
    }>;
  }>;
  mediaAssets: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    note: string | null;
    createdAt: string;
  }>;
  mentorReview?: {
    feedback: string;
    signedAt: string;
    mentor: {
      fullName: string;
    };
  } | null;
  parentReview?: {
    comment: string;
    signedAt: string;
  } | null;
  sprint?: {
    student: {
      id: string;
      fullName: string;
    };
  };
}

/**
 * Умная маршрутизация по дате и времени:
 * - Вс -> Ретроспектива (retro, день 7)
 * - Сб -> Проектный день / Самоподготовка (saturday, день 6)
 * - Пн-Пт -> До 13:00 Утренний фокус, после 13:00 Вечерний дебрифинг
 * При этом ручное переключение не блокируется.
 */
export function getSmartInitialSchedule(): { view: ViewMode; dayOfWeek: number } {
  const now = new Date();
  const rawDay = now.getDay(); // 0 = Вс, 1 = Пн, ..., 6 = Сб
  const dayOfWeek = rawDay === 0 ? 7 : rawDay;
  const currentHour = now.getHours();

  if (dayOfWeek === 7) {
    return { view: 'retro', dayOfWeek: 7 };
  }
  if (dayOfWeek === 6) {
    return { view: 'saturday', dayOfWeek: 6 };
  }
  return {
    view: currentHour < 13 ? 'morning' : 'evening',
    dayOfWeek,
  };
}

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isGodmode, setIsGodmode] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AppUser[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('morning');
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState(false);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active week data
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [sprintWeeks, setSprintWeeks] = useState<Array<{ weekNumber: number; isSubmitted: boolean }>>([]);
  const [currentWeekNum, setCurrentWeekNum] = useState(1);

  // Fetch auth с поддержкой надёжного Bearer-токена из localStorage
  const loadUser = async () => {
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('mezon_auth_token');
        } catch {}
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/auth/me', { headers });
      if (!res.ok) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('mezon_auth_token');
            localStorage.removeItem('mezon_auth_user');
          } catch {}
        }
        router.push('/login');
        return null;
      }
      const json = await res.json();
      if (!json.user) {
        router.push('/login');
        return null;
      }

      if (json.token && typeof window !== 'undefined') {
        try {
          localStorage.setItem('mezon_auth_token', json.token);
          localStorage.setItem('mezon_auth_user', JSON.stringify(json.user));
        } catch {}
      }

      setCurrentUser(json.user);
      setIsGodmode(json.isGodmode || false);
      setIsImpersonating(json.isImpersonating || false);
      setAvailableUsers(json.availableUsers || []);

      return json.user;
    } catch (e) {
      console.error(e);
      router.push('/login');
      return null;
    }
  };

  // Fetch active sprint & week
  const loadSprintAndWeek = async (weekNum?: number) => {
    try {
      setIsLoading(true);
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('mezon_auth_token');
        } catch {}
      }
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const sprintRes = await fetch('/api/v1/sprints/active', { headers });
      if (!sprintRes.ok) {
        setIsLoading(false);
        return;
      }
      const sprintJson = await sprintRes.json();
      const sprint = sprintJson.sprint;
      if (!sprint || !sprint.weeks || sprint.weeks.length === 0) {
        setWeekData(null);
        setIsLoading(false);
        return;
      }

      const activeNum = sprintJson.activeWeekNumber || 1;
      setCurrentWeekNum(activeNum);
      const targetNum = weekNum !== undefined ? weekNum : activeNum;
      setSelectedWeekNumber(targetNum);

      setSprintWeeks(
        (sprint.weeks || []).map((w: { weekNumber: number; isSubmitted: boolean }) => ({
          weekNumber: w.weekNumber,
          isSubmitted: w.isSubmitted,
        }))
      );

      const targetWeek =
        sprint.weeks.find((w: { weekNumber: number }) => w.weekNumber === targetNum) ||
        sprint.weeks[0];

      if (!targetWeek) {
        setIsLoading(false);
        return;
      }

      const weekRes = await fetch(`/api/v1/weeks/${targetWeek.id}`, { headers });
      if (weekRes.ok) {
        const weekJson = await weekRes.json();
        setWeekData(weekJson.week);
      }
    } catch (e) {
      console.error('Failed to load week data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const user = await loadUser();
      if (user) {
        if (user.role === 'ADMIN') {
          setCurrentView('godmode');
        } else if (user.role === 'MENTOR') {
          setCurrentView('mentor');
        } else if (user.role === 'PARENT') {
          setCurrentView('parent');
        } else {
          // Ученик: по дате и времени (до 13:00 утро, после 13:00 вечер)
          const smart = getSmartInitialSchedule();
          setCurrentView(smart.view);
          setSelectedDayOfWeek(smart.dayOfWeek);
        }
        await loadSprintAndWeek();
      }
    };
    init();
  }, []);

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/v1/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.token && typeof window !== 'undefined') {
          try {
            localStorage.setItem('mezon_auth_token', json.token);
            localStorage.setItem('mezon_auth_user', JSON.stringify(json.user));
          } catch {}
        }
        setCurrentUser(json.user);
        setIsImpersonating(json.isImpersonating || false);
        if (json.user.role === 'MENTOR') {
          setCurrentView('mentor');
        } else if (json.user.role === 'PARENT') {
          setCurrentView('parent');
        } else if (json.user.role === 'ADMIN') {
          setCurrentView('godmode');
        } else {
          const smart = getSmartInitialSchedule();
          setCurrentView(smart.view);
          setSelectedDayOfWeek(smart.dayOfWeek);
        }
        await loadSprintAndWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevertToAdmin = async () => {
    try {
      const res = await fetch('/api/v1/auth/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revertToAdmin: true }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.token && typeof window !== 'undefined') {
          try {
            localStorage.setItem('mezon_auth_token', json.token);
            localStorage.setItem('mezon_auth_user', JSON.stringify(json.user));
          } catch {}
        }
        setCurrentUser(json.user);
        setIsGodmode(true);
        setIsImpersonating(false);
        setCurrentView('godmode');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('mezon_auth_token');
          localStorage.removeItem('mezon_auth_user');
        } catch {}
      }
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  const handleSelectWeek = (num: number) => {
    setSelectedWeekNumber(num);
    loadSprintAndWeek(num);
  };

  const dayNames: Record<number, string> = {
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота (Проектный день)',
    7: 'Воскресенье (Ретроспектива)',
  };

  const currentDay =
    currentView === 'saturday'
      ? weekData?.days.find((d) => d.dayOfWeek === 6)
      : weekData?.days.find((d) => d.dayOfWeek === selectedDayOfWeek) || weekData?.days[0];

  const saturdayDay = weekData?.days.find((d) => d.dayOfWeek === 6);

  const DAY_SHORT: Record<number, string> = { 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт' };
  const showSpine = !isCoverOpen && currentView !== 'mentor' && currentView !== 'godmode' && weekData;
  const showDays = !isCoverOpen && (currentView === 'morning' || currentView === 'evening') && weekData;

  const displayName = weekData?.sprint?.student?.fullName || currentUser?.fullName || 'Ученик';

  return (
    <div className="mz-app">
      <NavigationHeader
        currentView={currentView}
        onViewChange={(v) => {
          setIsCoverOpen(false);
          setCurrentView(v);
          if (v === 'saturday') setSelectedDayOfWeek(6);
          if (v === 'retro') setSelectedDayOfWeek(7);
          if (v === 'morning' || v === 'evening') {
            if (selectedDayOfWeek > 5) {
              const rawDay = new Date().getDay();
              const todayDay = rawDay === 0 ? 7 : rawDay;
              setSelectedDayOfWeek(todayDay <= 5 ? todayDay : 1);
            }
          }
        }}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        isMobileDeviceFrame={isMobileDeviceFrame}
        onToggleDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
        selectedWeekNumber={selectedWeekNumber}
        isGodmode={isGodmode}
        isImpersonating={isImpersonating}
        onRevertToAdmin={handleRevertToAdmin}
        onLogout={handleLogout}
      >
        <main className="mz-main">
          <div
            className={
              isMobileDeviceFrame
                ? 'mz-frame'
                : `mz-page ${currentView === 'mentor' || currentView === 'godmode' ? 'mz-page--wide' : ''}`
            }
          >
            {isMobileDeviceFrame && (
              <div className="mz-status">
                <b className="mz-num">07:42</b>
                <span>Телефонный вакуум</span>
                <span className="mz-num">100%</span>
              </div>
            )}

            {showSpine && (
              <SprintSpine
                weeks={sprintWeeks}
                selectedWeekNumber={selectedWeekNumber}
                currentWeekNumber={currentWeekNum}
                onSelectWeek={handleSelectWeek}
              />
            )}

            {/* Дни недели — small multiples */}
            {showDays && weekData && (
              <div className="mz-days" role="tablist" aria-label="Дни недели">
                {[1, 2, 3, 4, 5].map((dNum) => {
                  const dObj = weekData.days.find((d) => d.dayOfWeek === dNum);
                  const active = dObj?.slots.filter((s) => !s.isGhost) || [];
                  const done = active.filter((s) => s.status === 'DONE').length;
                  const pct = active.length ? Math.round((done / active.length) * 100) : 0;
                  return (
                    <button
                      key={dNum}
                      type="button"
                      role="tab"
                      className="mz-day"
                      aria-pressed={selectedDayOfWeek === dNum}
                      aria-selected={selectedDayOfWeek === dNum}
                      onClick={() => setSelectedDayOfWeek(dNum)}
                    >
                      <b>{DAY_SHORT[dNum]}</b>
                      <span>{active.length ? `${done}/${active.length}` : '—'}</span>
                      <i>
                        <em style={{ width: `${pct}%` }} />
                      </i>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Главное на неделю */}
            {!isCoverOpen && weekData && (currentView === 'morning' || currentView === 'evening') && (
              <div className="mz-anchor">
                <div>
                  <small>Главное на неделю {weekData.weekNumber}</small>
                  <p>{weekData.weekGoal || 'Фокус на базовой программе четверти'}</p>
                </div>
                {weekData.deadlinesEvents && (
                  <div>
                    <small>Сроки и события</small>
                    <p className="soft">{weekData.deadlinesEvents}</p>
                  </div>
                )}
              </div>
            )}

            {/* Posture routing */}
            {currentView === 'godmode' ? (
              <AdminGodmodeView onSwitchToUser={handleSwitchUser} />
            ) : isLoading && !weekData ? (
              <Loading label="Загружаю спринт Mezon…" />
            ) : !weekData ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 24px',
                  maxWidth: 520,
                  margin: '40px auto',
                  background: '#ffffff',
                  border: '2px solid #222222',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px 0' }}>
                  Учебный спринт пока не назначен
                </h2>
                <p style={{ color: '#5f5f5f', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px 0' }}>
                  Здравствуйте, <strong>{currentUser?.fullName}</strong>! Ваша учетная запись активна.
                  Куратор или администратор школы создаст спринт и привяжет расписание вашей параллели.
                </p>
                {isGodmode && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('godmode')}
                    style={{
                      background: '#00859e',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 24px',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Открыть панель управления Godmode
                  </button>
                )}
              </div>
            ) : isCoverOpen ? (
              <MezonCoverView
                studentName={displayName}
                gradeLevel={currentUser?.gradeLevel || 9}
                onOpenSpread={() => setIsCoverOpen(false)}
              />
            ) : currentView === 'morning' && currentDay ? (
              <MorningFocusView
                dayId={currentDay.id}
                dayTitle={dayNames[currentDay.dayOfWeek]}
                dateStr={new Date(currentDay.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
                slots={currentDay.slots}
                weekGoal={weekData.weekGoal}
                onSlotUpdated={() => loadSprintAndWeek(selectedWeekNumber)}
                onNavigateToEvening={() => setCurrentView('evening')}
              />
            ) : currentView === 'evening' && currentDay ? (
              <EveningDebriefView
                dayId={currentDay.id}
                weekId={weekData.id}
                dayTitle={dayNames[currentDay.dayOfWeek]}
                dateStr={new Date(currentDay.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
                slots={currentDay.slots}
                mediaAssets={weekData.mediaAssets}
                onDebriefCompleted={() => loadSprintAndWeek(selectedWeekNumber)}
                onSlotUpdated={() => loadSprintAndWeek(selectedWeekNumber)}
                onNavigateToMorning={() => setCurrentView('morning')}
              />
            ) : currentView === 'saturday' && saturdayDay ? (
              <SaturdaySelfStudyView
                dayId={saturdayDay.id}
                dateStr={new Date(saturdayDay.date).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'long',
                })}
                slots={saturdayDay.slots}
                onSlotUpdated={() => loadSprintAndWeek(selectedWeekNumber)}
              />
            ) : currentView === 'retro' ? (
              <WeeklyRetroView
                weekId={weekData.id}
                weekNumber={weekData.weekNumber}
                initialSuccess={weekData.retroSuccess}
                initialBlockers={weekData.retroBlockers}
                initialNextPlan={weekData.retroNextPlan}
                isSubmitted={weekData.isSubmitted}
                initialParentAccessLevel={weekData.parentAccessLevel}
                mentorReview={weekData.mentorReview}
                parentReview={weekData.parentReview}
                onRetroSubmitted={() => loadSprintAndWeek(selectedWeekNumber)}
              />
            ) : currentView === 'mentor' ? (
              <MentorDashboardView />
            ) : currentView === 'parent' ? (
              <ParentPortalView
                studentName={displayName}
                accessLevel={weekData.parentAccessLevel}
                weekNumber={weekData.weekNumber}
                weekGoal={weekData.weekGoal}
                retroSuccess={weekData.retroSuccess}
                retroBlockers={weekData.retroBlockers}
                retroNextPlan={weekData.retroNextPlan}
                saturdaySlots={saturdayDay?.slots || []}
                parentComment={weekData.parentReview?.comment}
              />
            ) : null}
          </div>
        </main>
      </NavigationHeader>
    </div>
  );
}
