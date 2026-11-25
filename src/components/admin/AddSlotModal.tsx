'use client';

import React, { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Dialog, InlineAlert } from '../ui';
import { apiFetch } from '@/lib/api-client';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

interface AddSlotModalProps {
  gradeLevel: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSlotModal: React.FC<AddSlotModalProps> = ({ gradeLevel, onClose, onSuccess }) => {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:10');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!title.trim()) return setError('Укажите название предмета');
    if (endTime <= startTime) return setError('Урок должен заканчиваться позже, чем начинается');

    setIsSubmitting(true);
    setError(null);
    const res = await apiFetch('/api/v1/admin/timetable', {
      method: 'POST',
      body: { gradeLevel, dayOfWeek, startTime, endTime, title: title.trim() },
    });
    setIsSubmitting(false);
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Dialog title={`Новый урок · ${gradeLevel} класс`} icon={<CalendarPlus size={18} />} onClose={onClose} busy={isSubmitting}>
      <form onSubmit={handleSubmit} className="mz-stack" noValidate>
        {error && <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>}
        <label className="mz-field">
          <span className="mz-label">День недели</span>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))} className="mz-input">
            {Object.entries(DAY_NAMES).map(([d, name]) => (
              <option key={d} value={d}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="mz-grid2">
          <label className="mz-field">
            <span className="mz-label">Начало</span>
            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mz-input mz-num" />
          </label>
          <label className="mz-field">
            <span className="mz-label">Конец</span>
            <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mz-input mz-num" />
          </label>
        </div>

        <label className="mz-field">
          <span className="mz-label">Предмет</span>
          <input
            type="text"
            required
            maxLength={150}
            placeholder="Алгебра, физика, английский…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mz-input"
            autoFocus
          />
        </label>

        <p className="mz-hint">Урок появится у учеников, спринты которых будут созданы после этого изменения.</p>

        <div className="mz-row mz-row--end">
          <button type="button" onClick={onClose} className="mz-link">
            Отмена
          </button>
          <button type="submit" disabled={isSubmitting || !title.trim()} className="mz-btn mz-btn--primary">
            {isSubmitting ? 'Добавление…' : 'Добавить в сетку'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
