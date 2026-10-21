'use client';

import React, { useState, useEffect } from 'react';
import { Compass, CheckCircle2, UserCheck, Send, Check, X, AlertTriangle } from 'lucide-react';
import { ViewHero, Notice, Loading } from '@/components/ui';

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
  };
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

export const MentorDashboardView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    className: string;
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/mentor/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load mentor dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenReview = (student: StudentData, weekNum: number = 1) => {
    setSelectedStudent(student);
    const targetWeek = student.weeks.find((w) => w.weekNumber === weekNum) || student.weeks[0];
    setSelectedWeek(targetWeek);
    setMentorFeedbackText(targetWeek?.mentorFeedback || '');
    setReviewSuccessMessage(null);
  };

  const handleSelectWeek = (week: StudentData['weeks'][0]) => {
    setSelectedWeek(week);
    setMentorFeedbackText(week.mentorFeedback || '');
    setReviewSuccessMessage(null);
  };

  const handleSignMentorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek || !mentorFeedbackText.trim()) return;

    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/v1/mentor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: selectedWeek.id,
          feedback: mentorFeedbackText,
        }),
      });

      if (res.ok) {
        setReviewSuccessMessage('Ревью наставника успешно подписано.');
        await fetchDashboardData();
        // Update local selectedWeek
        setSelectedWeek((prev) => (prev ? { ...prev, hasMentorReview: true, mentorFeedback: mentorFeedbackText, signedAt: new Date().toISOString() } : null));
        setTimeout(() => setReviewSuccessMessage(null), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return <Loading label="Загрузка аналитики 9 класса…" />;
  }

  if (!data) {
    return (
      <div className="mz-empty">
        <h3>Ошибка загрузки данных</h3>
        <p>Не удалось получить сводку класса. Проверьте соединение с базой данных.</p>
      </div>
    );
  }

  const filteredStudents = data.students.filter((s) => {
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
          { value: data.redFlagsSummary.highMigrationsCount, label: 'перегрузка (>50%)' },
          { value: data.redFlagsSummary.emptySelfStudyCount, label: 'пустая суббота' },
          { value: data.redFlagsSummary.silentRetroCount, label: 'silent retro' },
        ]}
      />

      {/* Триада индикаторов риска — кликабельные карточки с переворотом цвета (Refactoring UI / Mezon style) */}
      <div className="mz-grid3" style={{ marginBottom: 'var(--s6)' }}>
        <button
          type="button"
          className="mz-metric mz-metric--error mz-flip"
          aria-pressed={activeFilter === 'HIGH_MIGRATIONS'}
          onClick={() => setActiveFilter(activeFilter === 'HIGH_MIGRATIONS' ? 'ALL' : 'HIGH_MIGRATIONS')}
        >
          <b className="v">{data.redFlagsSummary.highMigrationsCount}</b>
          <span className="k">🔴 High Migrations</span>
          <span className="d">&gt;50% задач перенесено — признак системной перегрузки</span>
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
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Notice tone="warn" icon={<AlertTriangle size={18} />}>
            Включён фильтр по маркеру риска: <strong>{activeFilter}</strong> ({filteredStudents.length} учеников).{' '}
            <button
              type="button"
              className="mz-link"
              onClick={() => setActiveFilter('ALL')}
              style={{ fontWeight: 700, marginLeft: 8 }}
            >
              Сбросить фильтр
            </button>
          </Notice>
        </div>
      )}

      {/* Cockpit: реестр слева + docked inspector справа (Cooper) */}
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
                <th style={{ textAlign: 'right' }}>Действие</th>
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
                      <div
                        className="mz-cell-num"
                        style={{ color: row.flags.highMigrations ? 'var(--error)' : undefined }}
                      >
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

                    {/* Ретро статус */}
                    <td>
                      {row.weeks.some((w) => w.isSubmitted) ? (
                        <span className="mz-chip mz-chip--teal">Сдана</span>
                      ) : (
                        <span className="mz-chip mz-chip--peach">В процессе</span>
                      )}
                    </td>

                    {/* Действие */}
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`mz-btn mz-btn--sm ${isSelected ? 'mz-btn--primary' : 'mz-btn--light'}`}
                        onClick={() => handleOpenReview(row, 1)}
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
            <div className="mz-row mz-row--between" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <span className="mz-chip mz-chip--magenta" style={{ marginBottom: 4 }}>
                  <UserCheck size={12} /> Наблюдение
                </span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: 'var(--dark)' }}>
                  {selectedStudent.student.fullName}
                </h3>
                <span className="mz-cell-sub" style={{ marginTop: 2 }}>
                  {data.className} · Неделя {selectedWeek.weekNumber} из 10
                </span>
              </div>
              <button
                type="button"
                className="mz-link"
                style={{ fontSize: 18, padding: 4 }}
                aria-label="Закрыть инспектор"
                onClick={() => setSelectedStudent(null)}
              >
                <X size={20} />
              </button>
            </div>

            {reviewSuccessMessage && (
              <div style={{ marginBottom: 'var(--s4)' }}>
                <Notice icon={<Check size={16} />}>{reviewSuccessMessage}</Notice>
              </div>
            )}

            {/* Выбор недели спринта */}
            <div style={{ marginBottom: 'var(--s4)' }}>
              <div className="mz-label" style={{ marginBottom: 6 }}>
                Неделя спринта
              </div>
              <div className="mz-weekchips" role="group" aria-label="Недели ученика">
                {selectedStudent.weeks.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={w.hasMentorReview ? 'signed' : ''}
                    aria-pressed={selectedWeek.id === w.id}
                    onClick={() => handleSelectWeek(w)}
                  >
                    W{w.weekNumber} {w.hasMentorReview && '✓'}
                  </button>
                ))}
              </div>
            </div>

            {/* Воскресная рефлексия ученика (PDCA) */}
            <div style={{ marginBottom: 'var(--s5)' }}>
              <div className="mz-label" style={{ marginBottom: 6 }}>
                Рефлексия ученика (PDCA)
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
                  value={mentorFeedbackText}
                  onChange={(e) => setMentorFeedbackText(e.target.value)}
                  placeholder="Отличный фокус на Definition of Done в физике. В субботу обрати внимание на декомпозицию…"
                  className="mz-textarea"
                />
              </label>

              <div className="mz-row mz-row--between" style={{ alignItems: 'center' }}>
                <div className="mz-cell-sub" style={{ marginTop: 0 }}>
                  {selectedWeek.signedAt ? (
                    <span style={{ color: 'var(--teal)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Подписано {new Date(selectedWeek.signedAt).toLocaleDateString('ru-RU')}
                    </span>
                  ) : (
                    <span>Ожидает подписи</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="mz-btn mz-btn--primary mz-btn--sm"
                >
                  <Send size={14} />
                  {isSubmittingReview ? 'Подписание…' : 'Подписать ревью'}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
};
