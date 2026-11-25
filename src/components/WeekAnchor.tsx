'use client';

import React, { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface WeekAnchorProps {
  weekId: string;
  weekNumber: number;
  weekGoal: string | null;
  deadlinesEvents: string | null;
  editable: boolean;
  onSaved: () => void;
}

/**
 * Якорь недели: «Главное на неделю» и «Сроки и события».
 * Ученик формулирует их сам (Plan в цикле PDCA) — прямо на месте, без модальных окон.
 */
export const WeekAnchor: React.FC<WeekAnchorProps> = ({ weekId, weekNumber, weekGoal, deadlinesEvents, editable, onSaved }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState(weekGoal ?? '');
  const [deadlines, setDeadlines] = useState(deadlinesEvents ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setGoal(weekGoal ?? '');
    setDeadlines(deadlinesEvents ?? '');
    setError(null);
    setIsEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    const res = await apiFetch(`/api/v1/weeks/${weekId}`, {
      method: 'PATCH',
      body: { weekGoal: goal.trim(), deadlinesEvents: deadlines.trim() },
    });
    setIsSaving(false);
    if (res.ok) {
      setIsEditing(false);
      onSaved();
    } else {
      setError(res.error);
    }
  };

  if (isEditing) {
    return (
      <form className="mz-anchor mz-anchor--editing mz-fade-in" onSubmit={save}>
        <label className="mz-anchor__field">
          <small>Главное на неделю {weekNumber}</small>
          <input
            className="mz-anchor__input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={300}
            placeholder="Одна цель, ради которой стоит эта неделя"
            autoFocus
          />
        </label>
        <label className="mz-anchor__field">
          <small>Сроки и события</small>
          <input
            className="mz-anchor__input"
            value={deadlines}
            onChange={(e) => setDeadlines(e.target.value)}
            maxLength={300}
            placeholder="Контрольная по алгебре — чт, дебаты — пт"
          />
        </label>
        <div className="mz-anchor__actions">
          {error && <span className="mz-anchor__error" role="alert">{error}</span>}
          <button type="button" className="mz-link mz-link--inverse" onClick={() => setIsEditing(false)} disabled={isSaving}>
            Отмена
          </button>
          <button type="submit" className="mz-btn mz-btn--sm mz-btn--peach" disabled={isSaving}>
            <Check size={14} /> {isSaving ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mz-anchor">
      <div>
        <small>Главное на неделю {weekNumber}</small>
        <p className={weekGoal ? undefined : 'soft'}>{weekGoal || (editable ? 'Сформулируй одну главную цель недели' : 'Цель недели не задана')}</p>
      </div>
      {deadlinesEvents && (
        <div>
          <small>Сроки и события</small>
          <p className="soft">{deadlinesEvents}</p>
        </div>
      )}
      {editable && (
        <button type="button" className="mz-anchor__edit" onClick={startEdit} aria-label="Изменить цель и события недели">
          <Pencil size={14} /> {weekGoal ? 'Изменить' : 'Задать цель'}
        </button>
      )}
    </div>
  );
};
