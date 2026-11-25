'use client';

import React from 'react';
import { Plus, RefreshCw, Trash2, KeyRound, X } from 'lucide-react';
import { TimetableSlot } from './types';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

interface AdminTimetableTabProps {
  timetableSlots: TimetableSlot[];
  timetableGrade: number;
  onGradeChange: (grade: number) => void;
  onOpenAddSlotModal: () => void;
  onDeleteSlot: (slot: TimetableSlot) => void;
  onSyncTimetable: () => void;
  isSyncingTimetable: boolean;
  syncResult: {
    timetableSlotsCount: number;
    totalSlotsPopulated: number;
    createdCurators: Array<{ fullName: string; username: string; temporaryPassword: string }>;
  } | null;
  onDismissSyncResult: () => void;
}

export const AdminTimetableTab: React.FC<AdminTimetableTabProps> = ({
  timetableSlots,
  timetableGrade,
  onGradeChange,
  onOpenAddSlotModal,
  onDeleteSlot,
  onSyncTimetable,
  isSyncingTimetable,
  syncResult,
  onDismissSyncResult,
}) => {
  const hasSaturday = timetableSlots.some((s) => s.dayOfWeek === 6);
  const days = hasSaturday ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];

  return (
    <div className="gm-box">
      <div className="gm-tt-header">
        <div>
          <div className="gm-box-subtitle text-teal">Сетка учебного плана школы</div>
          <h2 className="gm-box-title">Шаблон расписания по параллелям</h2>
          <p className="gm-box-desc">
            Источник «призрачных» уроков для спринтов, которые создаются после изменения. {timetableSlots.length} уроков в{' '}
            {timetableGrade} классе.
          </p>
        </div>

        <div className="gm-tt-controls">
          <div className="gm-grade-pills" role="group" aria-label="Параллель">
            {[8, 9, 10, 11].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGradeChange(g)}
                aria-pressed={timetableGrade === g}
                className={`gm-grade-pill ${timetableGrade === g ? 'gm-grade-pill--active' : ''}`}
              >
                {g} класс
              </button>
            ))}
          </div>

          <button type="button" onClick={onOpenAddSlotModal} className="gm-btn-add-slot">
            <Plus size={14} />
            <span>Добавить урок</span>
          </button>

          <button
            type="button"
            onClick={onSyncTimetable}
            disabled={isSyncingTimetable}
            className="gm-btn-refresh"
            title="Пересобрать шаблоны 8 и 9 классов из файла MIS"
          >
            <RefreshCw size={14} className={isSyncingTimetable ? 'animate-spin' : ''} />
            <span>{isSyncingTimetable ? 'Синхронизация…' : 'Синхронизировать из MIS'}</span>
          </button>
        </div>
      </div>

      {syncResult && syncResult.createdCurators.length > 0 && (
        <div className="gm-alert-success gm-credentials" role="status">
          <KeyRound size={18} />
          <div>
            <strong>Созданы кураторы — передайте временные пароли лично.</strong> Они показываются только сейчас.
            <ul>
              {syncResult.createdCurators.map((c) => (
                <li key={c.username}>
                  {c.fullName}: <code>@{c.username}</code> / <code>{c.temporaryPassword}</code>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={onDismissSyncResult} aria-label="Скрыть пароли" className="gm-credentials__close">
            <X size={16} />
          </button>
        </div>
      )}

      {timetableSlots.length === 0 && (
        <div className="gm-hint-note">
          Для {timetableGrade} класса шаблон пуст. Добавьте уроки вручную — новые ученики этой параллели получат их в спринт.
        </div>
      )}

      <div className="gm-tt-days">
        {days.map((d) => {
          const daySlots = timetableSlots
            .filter((s) => s.dayOfWeek === d)
            .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.orderIndex - b.orderIndex);

          return (
            <div key={d} className="gm-tt-day">
              <div className="gm-tt-day-title">
                {DAY_NAMES[d]} <span className="gm-muted">· {daySlots.length}</span>
              </div>
              {daySlots.length === 0 ? (
                <div className="gm-tt-empty">Нет уроков</div>
              ) : (
                <div className="gm-tt-slot-list">
                  {daySlots.map((s) => (
                    <div key={s.id} className="gm-tt-slot">
                      <div>
                        <div className="gm-tt-time">
                          {s.startTime} – {s.endTime}
                        </div>
                        <div className="gm-tt-name">{s.title}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteSlot(s)}
                        className="gm-btn-slot-del"
                        title="Удалить урок"
                        aria-label={`Удалить урок ${s.title}, ${DAY_NAMES[d]} ${s.startTime}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
