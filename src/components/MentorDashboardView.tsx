'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, UserCheck, Send, Check, X, AlertTriangle, Users } from 'lucide-react';
import { ViewHero, Notice, Loading, InlineAlert, EmptyState } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';
import { formatSchoolDateTime } from '@/lib/school-time';
import type { AppUser } from './NavigationHeader';

interface StudentData {
  student: {
    id: string;
    fullName: string;
    email: string;
    gradeLevel: number | null;
  };
  activeSprint: {
    id: string;
    title: string;
    weeksTotal: number;
  } | null;
  currentWeekNumber: number;
  flags: {
    highMigrations: boolean;
    emptySelfStudy: boolean;
    silentRetro: boolean;
    migrationRate: number;
    totalTasks: number;
    migratedTasks: number;
    emptySelfStudyWeeksCount: number;
    silentRetroSnippet?: string;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    migratedTasks: number;
    droppedTasks: number;
    completionRate: number;
    migrationRate: number;
  };
  weeks: Array<{
    id: string;
    weekNumber: number;
    isSubmitted: boolean;
    weekGoal: string | null;
    retroSuccess: string | null;
    retroBlockers: string | null;
    retroNextPlan: string | null;
    hasMentorReview: boolean;
    mentorFeedback?: string;
    signedAt?: string;
    mediaAssetsCount: number;
  }>;
  currentWeekId?: string;
}

interface DashboardData {
  className: string;
  gradeLevel: number | null;
  canChooseGrade: boolean;
  studentsCount: number;
  redFlagsSummary: {
    highMigrationsCount: number;
    emptySelfStudyCount: number;
    silentRetroCount: number;
  };
  students: StudentData[];
}

const GRADE_OPTIONS = [8, 9, 10, 11];

const FILTER_LABEL = {
  ALL: 'все',
  HIGH_MIGRATIONS: 'перегрузка',
  EMPTY_SELF_STUDY: 'пустая суббота',
  SILENT_RETRO: 'silent retro',
} as const;

export const MentorDashboardView: React.FC<{ mentor: AppUser }> = ({ mentor }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [data, setData] = useState<{
    className: string;
    gradeLevel: number | null;
    canChooseGrade: boolean;
    studentsCount: number;
    redFlagsSummary: {
      highMigrationsCount: number;
      emptySelfStudyCount: number;
      silentRetroCount: number;
    };
    students: StudentData[];
  } | null>(null);

  // Filter by risk flag
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'HIGH_MIGRATIONS' | 'EMPTY_SELF_STUDY' | 'SILENT_RETRO'>('ALL');

  // Contextual docked inspector (Cooper: Sovereign Posture, zero modal excise)
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<StudentData['weeks'][0] | null>(null);
  const [mentorFeedbackText, setMentorFeedbackText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (grade: number | null) => {
    const res = await apiFetch<DashboardData>(`/api/v1/mentor/dashboard${grade ? `?grade=${grade}` : ''}`);
    if (res.ok && res.data) {
      const fresh = res.data;
      setData(fresh);
      setLoadError(null);
      // Обновляем открытого в инспекторе ученика свежими данными
      setSelectedStudent((prev) => (prev ? fresh.students.find((s) => s.student.id === prev.student.id) ?? null : null));
    } else {
      setLoadError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchDashboardData(gradeFilter);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDashboardData, gradeFilter]);

  const handleOpenReview = (student: StudentData) => {
    setSelectedStudent(student);
    const targetWeek = student.weeks.find((w) => w.weekNumber === student.currentWeekNumber) || student.weeks[0] || null;
    setSelectedWeek(targetWeek);
    setMentorFeedbackText(targetWeek?.mentorFeedback || '');
    setReviewSuccessMessage(null);
    setReviewError(null);
  };

  const handleSelectWeek = (week: StudentData['weeks'][0]) => {
    setSelectedWeek(week);
    setMentorFeedbackText(week.mentorFeedback || '');
    setReviewSuccessMessage(null);
    setReviewError(null);
  };

  const handleSignMentorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !mentorFeedbackText.trim() || isSubmittingReview) return;

    setIsSubmittingReview(true);
    setReviewError(null);
    const res = await apiFetch('/api/v1/mentor/review', {
      method: 'POST',
      body: { weekId: selectedWeek.id, feedback: mentorFeedbackText.trim() },
    });
    setIsSubmittingReview(false);
    if (res.ok) {
      setReviewSuccessMessage('Ревью подписано и видно ученику в его ретроспективе.');
      setSelectedWeek((prev) =>
        prev ? { ...prev, hasMentorReview: true, mentorFeedback: mentorFeedbackText.trim(), signedAt: new Date().toISOString() } : null
      );
      fetchDashboardData(gradeFilter);
    } else {
      setReviewError(res.error);
    }
  };

  if (loading) {
    return <Loading label={`Загрузка класса${mentor.gradeLevel ? ` · ${mentor.gradeLevel} класс` : ''}…`} />;
  }

  if (!data) {
    return (
      <InlineAlert tone="error" title="Не удалось загрузить сводку класса" onRetry={() => fetchDashboardData(gradeFilter)}>
        {loadError}
      </InlineAlert>
    );
  }

  const filteredStudents = (data.students || []).filter((s) => {
    if (activeFilter === 'HIGH_MIGRATIONS') return s.flags.highMigrations;
    if (activeFilter === 'EMPTY_SELF_STUDY') return s.flags.emptySelfStudy;
    if (activeFilter === 'SILENT_RETRO') return s.flags.silentRetro;
    return true;
  });

  return (
    <div>
      <ViewHero
        tag={`Кабинет Куратора · ${data.className}`}
        title={
          <>
            Мониторинг субъектности и <span className="mz-hl">маркеры риска</span>
          </>
        }
        text={
          <>
            Выявление скрытых перегрузок, пропусков субботней работы и отписок в ретроспективе. Ревью открывается в инспекторе справа —
            без всплывающих модальных окон.
          </>
        }
        mascot="adm"
        stats={[
          { value: data.studentsCount, unit: 'чел.', label: 'учеников в классе' },
          { value: data.redFlagsSummary.highMigrationsCount, label: 'перегрузка (≥50%)' },
          { value: data.redFlagsSummary.emptySelfStudyCount, label: 'пустая суббота' },
          { value: data.redFlagsSummary.silentRetroCount, label: 'silent retro' },
        ]}
      />

      {data.canChooseGrade && (
        <div className="mz-row mz-gap-b" role="group" aria-label="Параллель">
          {[null, ...GRADE_OPTIONS].map((g) => (
            <button
              key={g ?? 'all'}
              type="button"
              className={`mz-btn mz-btn--sm ${gradeFilter === g ? 'mz-btn--primary' : 'mz-btn--light'}`}
              aria-pressed={gradeFilter === g}
              onClick={() => {
                setSelectedStudent(null);
                setGradeFilter(g);
              }}
            >
              {g ? `${g} класс` : 'Все классы'}
            </button>
          ))}
        </div>
      )}

      {loadError && (
        <div className="mz-gap-b">
          <InlineAlert tone="warn" onRetry={() => fetchDashboardData(gradeFilter)} onDismiss={() => setLoadError(null)}>
            {loadError}
          </InlineAlert>
        </div>
      )}

      {/* Триада индикаторов риска — кликабельные карточки с переворотом цвета (Refactoring UI / Mezon style) */}
      <div className="mz-grid3 mz-gap-b-lg">
        <button
          type="button"
          className="mz-metric mz-metric--error mz-flip"
          aria-pressed={activeFilter === 'HIGH_MIGRATIONS'}
          onClick={() => setActiveFilter(activeFilter === 'HIGH_MIGRATIONS' ? 'ALL' : 'HIGH_MIGRATIONS')}
        >
          <b className="v">{data.redFlagsSummary.highMigrationsCount}</b>
          <span className="k">🔴 High Migrations</span>
          <span className="d">≥50% задач перенесено — признак системной перегрузки</span>
        </button>

        <button
          type="button"
          className="mz-metric mz-metric--peach mz-flip"
          aria-pressed={activeFilter === 'EMPTY_SELF_STUDY'}
          onClick={() => setActiveFilter(activeFilter === 'EMPTY_SELF_STUDY' ? 'ALL' : 'EMPTY_SELF_STUDY')}
        >
          <b className="v">{data.redFlagsSummary.emptySelfStudyCount}</b>
          <span className="k">🟡 Empty Self-Study</span>
          <span className="d">Суббота не заполнена 2 недели подряд</span>
        </button>

        <button
          type="button"
          className="mz-metric mz-metric--lav mz-flip"
          aria-pressed={activeFilter === 'SILENT_RETRO'}
          onClick={() => setActiveFilter(activeFilter === 'SILENT_RETRO' ? 'ALL' : 'SILENT_RETRO')}
        >
          <b className="v">{data.redFlagsSummary.silentRetroCount}</b>
          <span className="k">⚪ Silent Retro</span>
          <span className="d">Формальные отписки короче 10 символов («ок», «норм»)</span>
        </button>
      </div>

      {activeFilter !== 'ALL' && (
        <div className="mz-gap-b">
          <Notice tone="warn" icon={<AlertTriangle size={18} />}>
            Фильтр: <strong>{FILTER_LABEL[activeFilter]}</strong> · {filteredStudents.length} уч.{' '}
            <button type="button" className="mz-link mz-link--strong" onClick={() => setActiveFilter('ALL')}>
              Сбросить фильтр
            </button>
          </Notice>
        </div>
      )}

      {/* Cockpit: реестр слева + docked inspector справа (Cooper) */}
      {data.students.length === 0 ? (
        <EmptyState
          icon={<Users size={40} />}
          title="В этой параллели пока нет учеников"
          description="Когда администратор зарегистрирует учеников класса, их спринты и маркеры риска появятся здесь."
        />
      ) : (
      <div className={`mz-cockpit ${selectedStudent ? 'mz-cockpit--open' : ''}`}>
        <div className="mz-table-wrap">
          <table className="mz-table">
            <thead>
              <tr>
                <th>Ученик</th>
                <th>DoD Успешность</th>
                <th>Переносы</th>
                <th>Маркеры риска</th>
                <th>Ретро</th>
                <th className="mz-ta-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((row) => {
                const hasFlags =
                  row.flags.highMigrations ||
                  row.flags.emptySelfStudy ||
                  row.flags.silentRetro;
                const isSelected = selectedStudent?.student.id === row.student.id;
                const trClass = [
                  isSelected ? 'is-selected' : '',
                  hasFlags ? 'is-flag' : 'is-ok',
                ].join(' ');

                return (
                  <tr key={row.student.id} className={trClass}>
                    {/* Ученик */}
                    <td>
                      <div className="mz-person">
                        <b>{row.student.fullName}</b>
                        <span>{row.student.email}</span>
                      </div>
                    </td>

                    {/* DoD Успешность */}
                    <td>
                      <div className="mz-cell-num">
                        {row.metrics.completionRate}
                        <small>%</small>
                      </div>
                      <div className="mz-cell-sub">
                        {row.metrics.completedTasks}/{row.metrics.totalTasks} DoD
                      </div>
                      <div className="mz-cell-bar">
                        <div className="mz-bar">
                          <i style={{ width: `${row.metrics.completionRate}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* Переносы */}
                    <td>
                      <div className={`mz-cell-num ${row.flags.highMigrations ? 'mz-text-error' : ''}`}>
                        {row.flags.migrationRate}
                        <small>%</small>
                      </div>
                      <div className="mz-cell-sub">{row.flags.migratedTasks} перенесено</div>
                      <div className="mz-cell-bar">
                        <div className="mz-bar mz-bar--error">
                          <i style={{ width: `${Math.min(100, row.flags.migrationRate)}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* Маркеры риска */}
                    <td>
                      <div className="mz-flags">
                        {row.flags.highMigrations && (
                          <span className="mz-chip mz-chip--error">
                            🔴 Перегрузка ({row.flags.migrationRate}%)
                          </span>
                        )}
                        {row.flags.emptySelfStudy && (
                          <span className="mz-chip mz-chip--peach">
                            🟡 Пустая суббота ({row.flags.emptySelfStudyWeeksCount} нед.)
                          </span>
                        )}
                        {row.flags.silentRetro && (
                          <span className="mz-chip mz-chip--outline">
                            ⚪ Silent Retro
                          </span>
                        )}
                        {!hasFlags && (
                          <span className="mz-chip mz-chip--teal">
                            ✓ Баланс в норме
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ретро прошлой недели — то, что куратор проверяет сейчас */}
                    <td>
                      {(() => {
                        const submitted = row.weeks.filter((w) => w.isSubmitted).length;
                        const due = Math.max(0, row.currentWeekNumber - 1);
                        const prev = row.weeks.find((w) => w.weekNumber === row.currentWeekNumber - 1);
                        return (
                          <>
                            {due === 0 ? (
                              <span className="mz-chip mz-chip--outline">Неделя 1</span>
                            ) : prev?.isSubmitted ? (
                              <span className="mz-chip mz-chip--teal">Сдана</span>
                            ) : (
                              <span className="mz-chip mz-chip--peach">Не сдана</span>
                            )}
                            <div className="mz-cell-sub">
                              {submitted} из {row.activeSprint?.weeksTotal ?? row.weeks.length}
                            </div>
                          </>
                        );
                      })()}
                    </td>

                    {/* Действие */}
                    <td className="mz-ta-right">
                      <button
                        type="button"
                        className={`mz-btn mz-btn--sm ${isSelected ? 'mz-btn--primary' : 'mz-btn--light'}`}
                        onClick={() => handleOpenReview(row)}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? 'Открыто' : 'Ревью'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Docked Inspector (Cooper: Contextual Inspector, No Modal Excise) */}
        {selectedStudent && selectedWeek && (
          <aside className="mz-inspector" aria-label="Контекстный инспектор ревью">
            <div className="mz-row mz-row--between mz-gap-b">
              <div>
                <span className="mz-chip mz-chip--magenta">
                  <UserCheck size={12} /> Наблюдение
                </span>
                <h3 className="mz-inspector__name">{selectedStudent.student.fullName}</h3>
                <span className="mz-cell-sub">
                  {selectedStudent.student.gradeLevel ? `${selectedStudent.student.gradeLevel} класс` : data.className} · Неделя{' '}
                  {selectedWeek.weekNumber} из {selectedStudent.activeSprint?.weeksTotal ?? selectedStudent.weeks.length}
                </span>
              </div>
              <button
                type="button"
                className="mz-icon-btn"
                aria-label="Закрыть инспектор"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={20} />
              </button>
            </div>

            {reviewSuccessMessage && (
              <div className="mz-gap-b">
                <Notice icon={<Check size={16} />}>{reviewSuccessMessage}</Notice>
              </div>
            )}
            {reviewError && (
              <div className="mz-gap-b">
                <InlineAlert onDismiss={() => setReviewError(null)}>{reviewError}</InlineAlert>
              </div>
            )}

            {/* Выбор недели спринта */}
            <div className="mz-gap-b">
              <div className="mz-label">Неделя спринта</div>
              <div className="mz-weekchips" role="group" aria-label="Недели ученика">
                {selectedStudent.weeks.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={[w.hasMentorReview ? 'signed' : '', w.weekNumber === selectedStudent.currentWeekNumber ? 'now' : '']
                      .join(' ')
                      .trim()}
                    aria-pressed={selectedWeek.id === w.id}
                    aria-label={`Неделя ${w.weekNumber}${w.hasMentorReview ? ', ревью подписано' : ''}${w.isSubmitted ? ', ретро сдано' : ''}`}
                    onClick={() => handleSelectWeek(w)}
                  >
                    W{w.weekNumber} {w.hasMentorReview && '✓'}
                  </button>
                ))}
              </div>
            </div>

            {/* Воскресная рефлексия ученика (PDCA) */}
            <div className="mz-gap-b-lg">
              <div className="mz-label">
                Рефлексия ученика (PDCA) {!selectedWeek.isSubmitted && <em>ещё не сдана</em>}
              </div>
              <div className="mz-retro">
                <div>
                  <b>01 · Успехи и DoD</b>
                  {selectedWeek.retroSuccess || '— нет записи —'}
                </div>
                <div>
                  <b>02 · Переносы и причины</b>
                  {selectedWeek.retroBlockers || '— нет записи —'}
                </div>
                <div>
                  <b>03 · План изменений</b>
                  {selectedWeek.retroNextPlan || '— нет записи —'}
                </div>
              </div>
            </div>

            {/* Форма ревью и подписи наставника */}
            <form onSubmit={handleSignMentorReview} className="mz-stack">
              <label className="mz-field">
                <span className="mz-label">
                  Обратная связь куратора <em>договорённости</em>
                </span>
                <textarea
                  rows={4}
                  required
                  maxLength={4000}
                  value={mentorFeedbackText}
                  onChange={(e) => setMentorFeedbackText(e.target.value)}
                  placeholder="Отличный фокус на Definition of Done в физике. В субботу обрати внимание на декомпозицию…"
                  className="mz-textarea"
                />
              </label>

              <div className="mz-row mz-row--between">
                <div className="mz-cell-sub mz-cell-sub--flush">
                  {selectedWeek.signedAt ? (
                    <span className="mz-signed">
                      <CheckCircle2 size={14} /> Подписано {formatSchoolDateTime(selectedWeek.signedAt, { day: 'numeric', month: 'long' })}
                    </span>
                  ) : (
                    <span>Ожидает подписи</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview || !mentorFeedbackText.trim()}
                  className="mz-btn mz-btn--primary mz-btn--sm"
                >
                  <Send size={14} />
                  {isSubmittingReview ? 'Подписание…' : selectedWeek.hasMentorReview ? 'Обновить ревью' : 'Подписать ревью'}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
      )}
    </div>
  );
};
