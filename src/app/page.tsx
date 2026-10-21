'use client';

import React, { useState, useEffect } from 'react';
import { NavigationHeader, ViewMode } from '@/components/NavigationHeader';
import { MorningFocusView } from '@/components/MorningFocusView';
import { EveningDebriefView } from '@/components/EveningDebriefView';
import { SaturdaySelfStudyView } from '@/components/SaturdaySelfStudyView';
import { WeeklyRetroView } from '@/components/WeeklyRetroView';
import { MentorDashboardView } from '@/components/MentorDashboardView';
import { ParentPortalView } from '@/components/ParentPortalView';
import { MezonCoverView } from '@/components/MezonCoverView';
import { SprintSpine } from '@/components/SprintSpine';
import { Loading } from '@/components/ui';

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  gradeLevel?: number | null;
}

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

export default function Home() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [availableUsers, setAvailableUsers] = useState<CurrentUser[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('morning');
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(3); // Default Week 3 (Active)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1); // Default Monday (Day 1)
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState(false);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active week data
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  // Все недели спринта (для small multiples)
  const [sprintWeeks, setSprintWeeks] = useState<Array<{ weekNumber: number; isSubmitted: boolean }>>([]);
  const CURRENT_WEEK = 3;

  // Fetch auth
  const loadUser = async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user);
        setAvailableUsers(json.availableUsers || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch active sprint & week
  const loadSprintAndWeek = async (weekNum: number = selectedWeekNumber) => {
    try {
      setIsLoading(true);
      const sprintRes = await fetch('/api/v1/sprints/active');
      if (!sprintRes.ok) return;
      const sprintJson = await sprintRes.json();
      const sprint = sprintJson.sprint;
      if (!sprint) return;

      setSprintWeeks(
        (sprint.weeks || []).map((w: { weekNumber: number; isSubmitted: boolean }) => ({
          weekNumber: w.weekNumber,
          isSubmitted: w.isSubmitted,
        }))
      );

      const targetWeek =
        sprint.weeks?.find((w: { weekNumber: number }) => w.weekNumber === weekNum) ||
        sprint.weeks?.[0];
      if (!targetWeek) return;

      const weekRes = await fetch(`/api/v1/weeks/${targetWeek.id}`);
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
    loadUser();
    loadSprintAndWeek(selectedWeekNumber);
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
        setCurrentUser(json.user);
        if (json.user.role === 'MENTOR') {
          setCurrentView('mentor');
        } else if (json.user.role === 'PARENT') {
          setCurrentView('parent');
        } else {
          setCurrentView('morning');
        }
        loadSprintAndWeek(selectedWeekNumber);
      }
    } catch (e) {
      console.error(e);
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
  const showSpine = !isCoverOpen && currentView !== 'mentor';
  const showDays = !isCoverOpen && (currentView === 'morning' || currentView === 'evening') && weekData;

  return (
    <div className="mz-app">
      <NavigationHeader
        currentView={currentView}
        onViewChange={(v) => {
          setIsCoverOpen(false);
          setCurrentView(v);
          if (v === 'saturday') setSelectedDayOfWeek(6);
          if (v === 'morning' || v === 'evening') {
            if (selectedDayOfWeek > 5) setSelectedDayOfWeek(1);
          }
        }}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={handleSwitchUser}
        isMobileDeviceFrame={isMobileDeviceFrame}
        onToggleDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
        selectedWeekNumber={selectedWeekNumber}
      >
        <main className="mz-main">
          <div
            className={
              isMobileDeviceFrame ? 'mz-frame' : `mz-page ${currentView === 'mentor' ? 'mz-page--wide' : ''}`
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
                currentWeekNumber={CURRENT_WEEK}
                onSelectWeek={handleSelectWeek}
              />
            )}

            {/* Дни недели — те же small multiples: доля выполненного видна без чисел */}
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

            {/* Главное на неделю — якорь, виден на утре и вечере */}
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

            {/* Роутинг по постурам (Cooper) */}
            {isLoading && !weekData ? (
              <Loading label="Загружаю спринт Mezon…" />
            ) : isCoverOpen ? (
              <MezonCoverView
                studentName={currentUser?.fullName || 'Даврон Рахимов'}
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
                weekGoal={weekData?.weekGoal}
                onSlotUpdated={() => loadSprintAndWeek(selectedWeekNumber)}
                onNavigateToEvening={() => setCurrentView('evening')}
              />
            ) : currentView === 'evening' && currentDay && weekData ? (
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
            ) : currentView === 'retro' && weekData ? (
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
            ) : currentView === 'parent' && weekData ? (
              <ParentPortalView
                studentName={weekData.sprint?.student?.fullName || 'Даврон Рахимов'}
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
