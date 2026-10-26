'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
};

interface AddSlotModalProps {
  gradeLevel: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddSlotModal: React.FC<AddSlotModalProps> = ({
  gradeLevel,
  onClose,
  onSuccess,
}) => {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:15');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel,
          dayOfWeek,
          startTime,
          endTime,
          title: title.trim(),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gm-modal-overlay">
      <div className="gm-modal">
        <div className="gm-modal-head">
          <h3 className="gm-modal-title">Добавить урок в расписание ({gradeLevel} класс)</h3>
          <button type="button" onClick={onClose} className="gm-modal-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="gm-form-group">
            <label className="gm-form-label">День недели</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
              className="gm-select"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {DAY_NAMES[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="gm-form-row">
            <div className="gm-form-group">
              <label className="gm-form-label">Начало (ЧЧ:ММ)</label>
              <input
                type="text"
                required
                placeholder="08:30"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="gm-input"
              />
            </div>
            <div className="gm-form-group">
              <label className="gm-form-label">Конец (ЧЧ:ММ)</label>
              <input
                type="text"
                required
                placeholder="09:15"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="gm-input"
              />
            </div>
          </div>

          <div className="gm-form-group">
            <label className="gm-form-label">Название предмета</label>
            <input
              type="text"
              required
              placeholder="Алгебра, Физика, Английский…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="gm-input"
            />
          </div>

          <div className="gm-modal-footer">
            <button type="button" onClick={onClose} className="gm-btn-cancel">
              Отмена
            </button>
            <button type="submit" disabled={isSubmitting} className="gm-btn-save">
              {isSubmitting ? 'Добавление…' : 'Добавить в сетку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
