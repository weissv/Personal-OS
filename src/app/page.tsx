'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ClipboardList, Link2Off } from 'lucide-react';
import { NavigationHeader, ViewMode, AppUser } from '@/components/NavigationHeader';
import { MorningFocusView } from '@/components/MorningFocusView';
import { EveningDebriefView } from '@/components/EveningDebriefView';
import { SaturdaySelfStudyView } from '@/components/SaturdaySelfStudyView';
import { WeeklyRetroView } from '@/components/WeeklyRetroView';
import { SprintSpine } from '@/components/SprintSpine';
import { WeekAnchor } from '@/components/WeekAnchor';
import { Loading, EmptyState, ErrorBoundary, InlineAlert, PageSkeleton } from '@/components/ui';
import { apiFetch, clearAuthToken } from '@/lib/api-client';
import { compareSlots, formatSchoolDate, smartStudentView } from '@/lib/school-time';
import { AccessLevel, ActiveSprintResponse, DAY_NAMES, DAY_SHORT, WeekData } from '@/lib/types';

// Тяжёлые «суверенные» экраны грузятся лениво — мобильный ученик их не скачивает
const AdminGodmodeView = dynamic(
  () => import('@/components/AdminGodmodeView').then((m) => m.AdminGodmodeView),
  { ssr: false, loading: () => <Loading label="Загрузка Godmode…" /> }
);
const MentorDashboardView = dynamic(
  () => import('@/components/MentorDashboardView').then((m) => m.MentorDashboardView),
  { ssr: false, loading: () => <Loading label="Загрузка кабинета куратора…" /> }
);
const ParentPortalView = dynamic(
  () => import('@/components/ParentPortalView').then((m) => m.ParentPortalView),
  { ssr: false, loading: () => <Loading label="Загрузка портала доверия…" /> }
);

interface MeResponse {
  user: AppUser | null;
  isGodmode: boolean;
  isImpersonating: boolean;
  realAdmin: { id: string; fullName: string } | null;
}

type SprintMeta = NonNullable<ActiveSprintResponse['sprint']>;

const STUDENT_VIEWS: ViewMode[] = ['morning', 'evening', 'saturday', 'retro'];

/** Экран по роли: ученику — по дню и времени Ташкента. */
function initialViewFor(role: string): { view: ViewMode; dayOfWeek: number } {
  if (role === 'ADMIN') return { view: 'godmode', dayOfWeek: 1 };
  if (role === 'MENTOR') return { view: 'mentor', dayOfWeek: 1 };
  if (role === 'PARENT') return { view: 'parent', dayOfWeek: 1 };
  return smartStudentView();
}

/** Для будних экранов: сегодняшний день, а в выходные — понедельник. */
function weekdayOrMonday(day: number) {
  return day >= 1 && day <= 5 ? day : 1;
}

export default function Home() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('morning');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(1);
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState(false);
  // День недели по Ташкенту — вычисляется после монтирования (не во время пререндера)
  const [todayDow, setTodayDow] = useState(0);

  const [sprint, setSprint] = useState<SprintMeta | null>(null);
  const [sprintInfo, setSprintInfo] = useState<Pick<ActiveSprintResponse, 'reason' | 'parentAccessLevel' | 'student' | 'children'> | null>(null);
  // Родитель нескольких детей: чей дневник открыт
  const [childId, setChildId] = useState<string | null>(null);
  const [currentWeekNum, setCurrentWeekNum] = useState(1);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Защита от гонок: ответ устаревшего запроса (быстрое переключение недель) не перезаписывает новый
  const requestSeq = useRef(0);

  const goToLogin = useCallback(() => {
    clearAuthToken();
    router.replace('/login');
  }, [router]);

  /** Загружает активный спринт и выбранную неделю. weekNum не задан — текущая неделя спринта. */
  const loadSprintAndWeek = useCallback(
    async (weekNum?: number) => {
      const seq = ++requestSeq.current;
      const sprintRes = await apiFetch<ActiveSprintResponse>(
        `/api/v1/sprints/active${childId ? `?studentId=${encodeURIComponent(childId)}` : ''}`
      );
      if (seq !== requestSeq.current) return;
      if (sprintRes.status === 401) return goToLogin();
      if (!sprintRes.ok || !sprintRes.data) {
        setLoadError(sprintRes.error);
        setIsLoading(false);
        return;
      }

      const { sprint: active, currentWeekNumber, reason, parentAccessLevel, student, children = [] } = sprintRes.data;
      setSprintInfo({ reason, parentAccessLevel, student, children });
      setSprint(active);

      if (!active || active.weeks.length === 0) {
        setWeekData(null);
        setLoadError(null);
        setIsLoading(false);
        return;
      }

      const current = currentWeekNumber ?? 1;
      setCurrentWeekNum(current);
      const target = active.weeks.find((w) => w.weekNumber === (weekNum ?? current)) ?? active.weeks[0];
      setSelectedWeekNumber(target.weekNumber);

      // Родитель без доступа: неделю не запрашиваем — сервер всё равно ответит 403
      if (parentAccessLevel === 'REVOKED' && student && me?.user?.role === 'PARENT') {
        setWeekData(null);
        setLoadError(null);
        setIsLoading(false);
        return;
      }

      const weekRes = await apiFetch<{ week: WeekData }>(`/api/v1/weeks/${target.id}`);
      if (seq !== requestSeq.current) return;
      if (weekRes.ok && weekRes.data) {
        const week = weekRes.data.week;
        week.days = [...week.days]
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((d) => ({ ...d, slots: [...d.slots].sort(compareSlots) }));
        setWeekData(week);
        setLoadError(null);
      } else {
        setLoadError(weekRes.error);
      }
      setIsLoading(false);
    },
    [goToLogin, me?.user?.role, childId]
  );

  const applyIdentity = useCallback((next: MeResponse) => {
    setMe(next);
    setChildId(null);
    setTodayDow(smartStudentView().dayOfWeek);
    if (!next.user) return;
    const initial = initialViewFor(next.user.role);
    setCurrentView(initial.view);
    setSelectedDayOfWeek(initial.dayOfWeek);
    setIsMobileDeviceFrame(false);
  }, []);

  // Первичная загрузка: кто я → спринт и текущая неделя
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch<MeResponse>('/api/v1/auth/me');
      if (cancelled) return;
      if (!res.ok || !res.data?.user) return goToLogin();
      applyIdentity(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyIdentity, goToLogin]);

  // Спринт загружается после того, как известна роль (и перезагружается при имперсонации)
  const userId = me?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadSprintAndWeek();
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loadSprintAndWeek]);

  const reloadWeek = useCallback(() => loadSprintAndWeek(selectedWeekNumber), [loadSprintAndWeek, selectedWeekNumber]);

  const handleSwitchUser = async (targetId: string) => {
    const res = await apiFetch<{ user: AppUser; isImpersonating: boolean }>('/api/v1/auth/switch', {
      method: 'POST',
      body: { userId: targetId },
    });
    if (!res.ok || !res.data) {
      setLoadError(res.error);
      return;
    }
    setIsLoading(true);
    setWeekData(null);
    applyIdentity({
      user: res.data.user,
      isGodmode: true,
      isImpersonating: res.data.isImpersonating,
      realAdmin: me?.realAdmin ?? (me?.user ? { id: me.user.id, fullName: me.user.fullName } : null),
    });
  };

  const handleRevertToAdmin = async () => {
    const res = await apiFetch<{ user: AppUser }>('/api/v1/auth/switch', { method: 'POST', body: { revertToAdmin: true } });
    if (!res.ok || !res.data) {
      setLoadError(res.error);
      return;
    }
    setWeekData(null);
    applyIdentity({ user: res.data.user, isGodmode: true, isImpersonating: false, realAdmin: null });
  };

  const handleLogout = async () => {
    await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    goToLogin();
  };

  const handleSelectWeek = (num: number) => {
    setSelectedWeekNumber(num);
    setIsLoading(true);
    loadSprintAndWeek(num);
  };

  const handleViewChange = (v: ViewMode) => {
    setCurrentView(v);
    if (v === 'saturday') setSelectedDayOfWeek(6);
    if (v === 'retro') setSelectedDayOfWeek(7);
    if ((v === 'morning' || v === 'evening') && selectedDayOfWeek > 5) {
      setSelectedDayOfWeek(weekdayOrMonday(todayDow));
    }
  };

  const isStudentView = STUDENT_VIEWS.includes(currentView);
  const isWeekdayView = currentView === 'morning' || currentView === 'evening';

  const currentDay = useMemo(
    () => weekData?.days.find((d) => d.dayOfWeek === selectedDayOfWeek) ?? null,
    [weekData, selectedDayOfWeek]
  );
  const saturdayDay = weekData?.days.find((d) => d.dayOfWeek === 6) ?? null;
  const weeksTotal = sprint?.weeksTotal ?? 10;
  const displayName = weekData?.sprint?.student?.fullName || sprintInfo?.student?.fullName || me?.user?.fullName || 'Ученик';

  const sprintWeeks = useMemo(
    () => (sprint?.weeks ?? []).map((w) => ({ weekNumber: w.weekNumber, isSubmitted: w.isSubmitted })),
    [sprint]
  );

  const showSpine = !!weekData && (isStudentView || currentView === 'parent');
  const pageWide = currentView === 'mentor' || currentView === 'godmode';

  const renderMain = () => {
    if (!me?.user) return <PageSkeleton label="Проверяю сессию…" />;

    if (currentView === 'godmode') return <AdminGodmodeView onSwitchToUser={handleSwitchUser} adminName={me.realAdmin?.fullName ?? me.user.fullName} />;
    if (currentView === 'mentor') return <MentorDashboardView mentor={me.user} />;

    if (isLoading && !weekData) return <PageSkeleton label="Загружаю спринт…" />;

    if (loadError && !weekData) {
      return (
        <InlineAlert tone="error" title="Не удалось загрузить дневник" onRetry={() => loadSprintAndWeek(selectedWeekNumber)}>
          {loadError}
        </InlineAlert>
      );
    }

    if (currentView === 'parent') {
      if (sprintInfo?.reason === 'NO_LINK') {
        return (
          <EmptyState
            icon={<Link2Off size={40} />}
            title="Аккаунт ещё не привязан к ученику"
            description="Администратор школы свяжет ваш профиль с профилем ребёнка — после этого здесь появятся его недели."
          />
        );
      }
      const accessLevel: AccessLevel = weekData?.parentAccessLevel ?? sprintInfo?.parentAccessLevel ?? 'REVOKED';
      return (
        <ParentPortalView
          key={`${sprintInfo?.student?.id ?? 'none'}-${weekData?.id ?? 'revoked'}`}
          linkedChildren={sprintInfo?.children ?? []}
          activeChildId={sprintInfo?.student?.id ?? null}
          onSelectChild={(id) => {
            setIsLoading(true);
            setWeekData(null);
            setChildId(id);
          }}
          studentName={displayName}
          accessLevel={accessLevel}
          weekNumber={weekData?.weekNumber ?? currentWeekNum}
          week={weekData}
          onCommentSubmitted={reloadWeek}
        />
      );
    }

    if (!weekData) {
      return (
        <EmptyState
          icon={<ClipboardList size={40} />}
          title="Учебный спринт пока не назначен"
          description={
            <>
              Здравствуйте, <strong>{me.user.fullName}</strong>! Аккаунт активен. Куратор или администратор школы создаст спринт
              и подключит расписание вашей параллели.
            </>
          }
          actionText={me.isGodmode ? 'Открыть Godmode' : undefined}
          onAction={me.isGodmode ? () => setCurrentView('godmode') : undefined}
        />
      );
    }

    if (isWeekdayView && currentDay) {
      const common = {
        dayId: currentDay.id,
        dayTitle: DAY_NAMES[currentDay.dayOfWeek],
        dateStr: formatSchoolDate(currentDay.date),
        slots: currentDay.slots,
      };
      return currentView === 'morning' ? (
        <MorningFocusView
          key={`m-${currentDay.id}`}
          {...common}
          onSlotUpdated={reloadWeek}
          onNavigateToEvening={() => setCurrentView('evening')}
        />
      ) : (
        <EveningDebriefView
          key={`e-${currentDay.id}-${currentDay.slots.map((s) => s.id).join('.')}`}
          {...common}
          weekId={weekData.id}
          mediaAssets={weekData.mediaAssets}
          onDebriefCompleted={reloadWeek}
          onSlotUpdated={reloadWeek}
          onNavigateToMorning={() => setCurrentView('morning')}
        />
      );
    }

    if (currentView === 'saturday' && saturdayDay) {
      return (
        <SaturdaySelfStudyView
          key={saturdayDay.id}
          dayId={saturdayDay.id}
          dateStr={formatSchoolDate(saturdayDay.date, { day: 'numeric', month: 'long' })}
          slots={saturdayDay.slots}
          onSlotUpdated={reloadWeek}
        />
      );
    }

    if (currentView === 'retro') {
      return (
        <WeeklyRetroView
          key={weekData.id}
          weekId={weekData.id}
          weekNumber={weekData.weekNumber}
          initialSuccess={weekData.retroSuccess}
          initialBlockers={weekData.retroBlockers}
          initialNextPlan={weekData.retroNextPlan}
          isSubmitted={weekData.isSubmitted}
          initialParentAccessLevel={weekData.parentAccessLevel}
          mentorReview={weekData.mentorReview}
          parentReview={weekData.parentReview}
          onRetroSubmitted={reloadWeek}
        />
      );
    }
    return null;
  };

  return (
    <ErrorBoundary fallbackTitle="Сбой в рабочей области Sprint OS">
      <div className="mz-app">
        <NavigationHeader
          currentView={currentView}
          onViewChange={handleViewChange}
          currentUser={me?.user ?? null}
          isMobileDeviceFrame={isMobileDeviceFrame}
          onToggleDeviceFrame={() => setIsMobileDeviceFrame((v) => !v)}
          selectedWeekNumber={selectedWeekNumber}
          weeksTotal={weeksTotal}
          sprintTitle={sprint?.title ?? null}
          showWeek={!!sprint && (isStudentView || currentView === 'parent')}
          isGodmode={!!me?.isGodmode}
          isImpersonating={!!me?.isImpersonating}
          onRevertToAdmin={handleRevertToAdmin}
          onLogout={handleLogout}
        >
          <main className="mz-main" id="main">
            <div className={isMobileDeviceFrame ? 'mz-frame' : `mz-page ${pageWide ? 'mz-page--wide' : ''}`}>
              {isMobileDeviceFrame && (
                <div className="mz-status" aria-hidden="true">
                  <b className="mz-num">Предпросмотр</b>
                  <span>Телефон ученика · 390 px</span>
                </div>
              )}

              {showSpine && (
                <SprintSpine
                  weeks={sprintWeeks}
                  weeksTotal={weeksTotal}
                  selectedWeekNumber={selectedWeekNumber}
                  currentWeekNumber={currentWeekNum}
                  onSelectWeek={handleSelectWeek}
                  isLoading={isLoading}
                />
              )}

              {weekData && isWeekdayView && (
                <div className="mz-days" role="tablist" aria-label="Дни недели">
                  {[1, 2, 3, 4, 5].map((dNum) => {
                    const dObj = weekData.days.find((d) => d.dayOfWeek === dNum);
                    const active = dObj?.slots.filter((s) => !s.isGhost) ?? [];
                    const done = active.filter((s) => s.status === 'DONE').length;
                    const pct = active.length ? Math.round((done / active.length) * 100) : 0;
                    const isToday = weekData.weekNumber === currentWeekNum && todayDow === dNum;
                    return (
                      <button
                        key={dNum}
                        type="button"
                        role="tab"
                        className={`mz-day ${isToday ? 'mz-day--today' : ''}`}
                        aria-selected={selectedDayOfWeek === dNum}
                        aria-label={`${DAY_NAMES[dNum]}${isToday ? ' (сегодня)' : ''}: ${done} из ${active.length} готово`}
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

              {weekData && isWeekdayView && (
                <WeekAnchor
                  key={`${weekData.id}-${weekData.weekGoal ?? ''}-${weekData.deadlinesEvents ?? ''}`}
                  weekId={weekData.id}
                  weekNumber={weekData.weekNumber}
                  weekGoal={weekData.weekGoal}
                  deadlinesEvents={weekData.deadlinesEvents}
                  editable={me?.user?.role === 'STUDENT'}
                  onSaved={reloadWeek}
                />
              )}

              {loadError && weekData && (
                <div className="mz-gap-b">
                  <InlineAlert tone="error" onRetry={reloadWeek} onDismiss={() => setLoadError(null)}>
                    {loadError}
                  </InlineAlert>
                </div>
              )}

              {renderMain()}
            </div>
          </main>
        </NavigationHeader>
      </div>
    </ErrorBoundary>
  );
}
