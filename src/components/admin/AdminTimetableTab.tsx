'use client';

import React from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { TimetableSlot } from './types';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
};

interface AdminTimetableTabProps {
  timetableSlots: TimetableSlot[];
  timetableGrade: number;
  onGradeChange: (grade: number) => void;
  onOpenAddSlotModal: () => void;
  onDeleteSlot: (slotId: string) => void;
  onSyncTimetable: () => void;
  isSyncingTimetable: boolean;
}

export const AdminTimetableTab: React.FC<AdminTimetableTabProps> = ({
  timetableSlots,
  timetableGrade,
  onGradeChange,
  onOpenAddSlotModal,
  onDeleteSlot,
  onSyncTimetable,
  isSyncingTimetable,
}) => {
  return (
    <div className="gm-box">
      <div className="gm-tt-header">
        <div>
          <div className="gm-box-subtitle text-teal">Сетка учебного плана школы</div>
          <h2 className="gm-box-title">Шаблон расписания по параллелям</h2>
          <p className="gm-box-desc">
            Эти уроки служат источником для генерации спринтов новых учеников.
          </p>
        </div>

        <div className="gm-tt-controls">
          <div className="gm-grade-pills">
            {[8, 9, 10, 11].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGradeChange(g)}
                className={`gm-grade-pill ${timetableGrade === g ? 'gm-grade-pill--active' : ''}`}
              >
                {g} класс
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenAddSlotModal}
            className="gm-btn-add-slot"
          >
            <Plus size={14} />
            <span>Добавить урок</span>
          </button>

          <button
            type="button"
            onClick={onSyncTimetable}
            disabled={isSyncingTimetable}
            className="gm-btn-refresh"
            style={{ marginLeft: 8 }}
            title="Синхронизировать сетку 8 и 9 классов из файла MIS"
          >
            <RefreshCw size={14} className={isSyncingTimetable ? 'animate-spin' : ''} />
            <span>{isSyncingTimetable ? 'Синхронизация…' : 'Синхронизировать из MIS'}</span>
          </button>
        </div>
      </div>

      {/* Timetable days breakdown */}
      <div className="gm-tt-days">
        {[1, 2, 3, 4, 5].map((d) => {
          const daySlots = timetableSlots
            .filter((s) => s.dayOfWeek === d)
            .sort((a, b) => a.orderIndex - b.orderIndex || a.startTime.localeCompare(b.startTime));

          return (
            <div key={d} className="gm-tt-day">
              <div className="gm-tt-day-title">{DAY_NAMES[d]}</div>
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
                        onClick={() => onDeleteSlot(s.id)}
                        className="gm-btn-slot-del"
                        title="Удалить урок"
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
