'use client';

import React from 'react';

interface SprintSpineProps {
  weeks: Array<{ weekNumber: number; isSubmitted: boolean }>;
  weeksTotal: number;
  selectedWeekNumber: number;
  currentWeekNumber: number;
  onSelectWeek: (weekNumber: number) => void;
  isLoading?: boolean;
}

const STATE_LABEL = { done: 'сдана', now: 'сейчас', late: 'без ретро', plan: 'впереди' } as const;

/**
 * Small multiples (Tufte): весь спринт — N одинаковых ячеек, сравнимых одним взглядом.
 * Цвет полоски несёт данные: бирюзовый — неделя закрыта, магента — идёт сейчас,
 * красный — неделя прошла без ретроспективы, штриховка — впереди.
 */
export const SprintSpine: React.FC<SprintSpineProps> = ({
  weeks,
  weeksTotal,
  selectedWeekNumber,
  currentWeekNumber,
  onSelectWeek,
  isLoading = false,
}) => {
  const list = weeks.length
    ? weeks
    : Array.from({ length: weeksTotal }, (_, i) => ({ weekNumber: i + 1, isSubmitted: false }));
  const closed = list.filter((w) => w.isSubmitted).length;

  return (
    <section className="mz-spine" aria-label={`Спринт: ${weeksTotal} недель`} aria-busy={isLoading}>
      <div className="mz-spine__head">
        <h2>Спринт · {weeksTotal} недель</h2>
        <span className="mz-num">
          <strong>{closed}</strong> из {weeksTotal} закрыто
        </span>
      </div>
      <div className="mz-spine__grid" style={{ ['--weeks' as string]: Math.min(list.length, 16) }}>
        {list.map((w) => {
          const state = w.isSubmitted
            ? 'done'
            : w.weekNumber === currentWeekNumber
              ? 'now'
              : w.weekNumber < currentWeekNumber
                ? 'late'
                : 'plan';
          return (
            <button
              key={w.weekNumber}
              type="button"
              className={`mz-week mz-week--${state}`}
              aria-pressed={selectedWeekNumber === w.weekNumber}
              aria-label={`Неделя ${w.weekNumber}: ${STATE_LABEL[state]}`}
              onClick={() => onSelectWeek(w.weekNumber)}
              disabled={isLoading && selectedWeekNumber !== w.weekNumber}
            >
              <b>{w.weekNumber}</b>
              <small>{STATE_LABEL[state]}</small>
              <i />
            </button>
          );
        })}
      </div>
    </section>
  );
};
