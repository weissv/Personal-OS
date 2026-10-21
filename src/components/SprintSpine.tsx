'use client';

import React from 'react';

interface SprintSpineProps {
  weeks: Array<{ weekNumber: number; isSubmitted: boolean }>;
  selectedWeekNumber: number;
  currentWeekNumber: number;
  onSelectWeek: (weekNumber: number) => void;
}

/**
 * Small multiples (Tufte): весь 10-недельный спринт — десять одинаковых ячеек,
 * сравнимых одним взглядом. Цвет полоски несёт данные:
 * бирюзовый — неделя закрыта, магента — идёт сейчас, штриховка — впереди.
 */
export const SprintSpine: React.FC<SprintSpineProps> = ({
  weeks,
  selectedWeekNumber,
  currentWeekNumber,
  onSelectWeek,
}) => {
  const closed = weeks.filter((w) => w.isSubmitted).length;
  const list = weeks.length ? weeks : Array.from({ length: 10 }, (_, i) => ({ weekNumber: i + 1, isSubmitted: false }));

  return (
    <section className="mz-spine" aria-label="10-недельный спринт">
      <div className="mz-spine__head">
        <h2>Спринт · 10 недель</h2>
        <span className="mz-num">
          <strong>{closed}</strong> из 10 закрыто
        </span>
      </div>
      <div className="mz-spine__grid">
        {list.map((w) => {
          const state = w.isSubmitted ? 'done' : w.weekNumber === currentWeekNumber ? 'now' : 'plan';
          return (
            <button
              key={w.weekNumber}
              type="button"
              className={`mz-week mz-week--${state}`}
              aria-pressed={selectedWeekNumber === w.weekNumber}
              onClick={() => onSelectWeek(w.weekNumber)}
              title={`Неделя ${w.weekNumber}`}
            >
              <b>{w.weekNumber}</b>
              <small>{state === 'done' ? 'сдана' : state === 'now' ? 'сейчас' : 'план'}</small>
              <i />
            </button>
          );
        })}
      </div>
    </section>
  );
};
