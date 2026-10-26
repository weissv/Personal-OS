'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, Play, Pause, RotateCcw, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { ViewHero, InlineAlert } from '@/components/ui';

interface DaySlot {
  id: string;
  dayId: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  type: string;
  isGhost: boolean;
  taskGoal: string | null;
  deliverable: string | null;
  status: string;
  orderIndex: number;
}

interface SaturdaySelfStudyViewProps {
  dayId: string;
  dateStr: string;
  slots: DaySlot[];
  onSlotUpdated: () => void;
}

export const SaturdaySelfStudyView: React.FC<SaturdaySelfStudyViewProps> = ({
  dayId,
  dateStr,
  slots,
  onSlotUpdated,
}) => {
  // Deep Work Sprint Timer (90 minutes)
  const [timerSeconds, setTimerSeconds] = useState(90 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Inline project block creation (Cooper: in-place, zero modal)
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [durationHours, setDurationHours] = useState('02:00');
  const [projectGoal, setProjectGoal] = useState('');
  const [projectDeliverable, setProjectDeliverable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleSlotStatus = async (slotId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/slots/${slotId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        onSlotUpdated();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Не удалось обновить статус слота.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Сетевая ошибка при изменении статуса проекта.');
    }
  };

  const handleCreateSelfStudySlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = projectTitle.trim();
    if (!title || title.length < 3) {
      setErrorMessage('Название проектного блока должно быть не менее 3 символов.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/slots/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId,
          title,
          startTime: '10:00',
          endTime: durationHours,
          taskGoal: projectGoal.trim(),
          deliverable: projectDeliverable.trim(),
          type: 'SELF_STUDY',
        }),
      });
      if (res.ok) {
        onSlotUpdated();
        setIsAddingBlock(false);
        setProjectTitle('');
        setProjectGoal('');
        setProjectDeliverable('');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Не удалось добавить субботний проект.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Ошибка сети при добавлении проекта.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selfStudySlots = slots.filter((s) => !s.isGhost);
  const doneCount = selfStudySlots.filter((s) => s.status === 'DONE').length;
  const elapsedPct = ((90 * 60 - timerSeconds) / (90 * 60)) * 100;

  return (
    <div>
      <ViewHero
        tag="Суббота · Self-Study"
        title={
          <>
            Свобода от звонков: <span className="mz-hl">один проект</span>, один артефакт
          </>
        }
        text={
          <>
            Автономные инженерные и исследовательские блоки. Формула каждого блока — <strong>что делаю → Definition of Done</strong>.
          </>
        }
        mascot="intro"
        stats={[
          { value: selfStudySlots.length, unit: 'шт.', label: 'проектных блоков' },
          { value: `${doneCount}/${selfStudySlots.length}`, label: 'сдано' },
          { value: 90, unit: 'мин', label: 'длина фокус-спринта' },
        ]}
      />

      {errorMessage && (
        <div style={{ marginBottom: 'var(--s5)' }}>
          <InlineAlert tone="error" onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </InlineAlert>
        </div>
      )}

      {/* Таймер глубокого фокуса: технологичный тёмный блок Mezon */}
      <section className="mz-timer" aria-label="Таймер глубокого фокуса">
        <div className="mz-timer__clock">
          <div style={{ display: 'inline-flex', marginBottom: 6 }}>
            <span className="mz-chip mz-chip--teal">Deep Work · 90 мин</span>
          </div>
          <div>{formatTimer(timerSeconds)}</div>
        </div>
        <div className="mz-stack" style={{ width: '100%' }}>
          <div className="mz-bar mz-bar--tall" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <i style={{ width: `${elapsedPct}%`, background: 'var(--peach)' }} />
          </div>
          <div className="mz-row">
            <button
              type="button"
              className={`mz-btn ${isTimerRunning ? 'mz-btn--peach' : 'mz-btn--teal'}`}
              onClick={() => setIsTimerRunning(!isTimerRunning)}
            >
              {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
              {isTimerRunning ? 'Пауза' : 'Старт блока'}
            </button>
            <button
              type="button"
              className="mz-btn mz-btn--light"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(90 * 60);
              }}
            >
              <RotateCcw size={14} /> Сбросить
            </button>
          </div>
        </div>
      </section>

      <div className="mz-h2">
        <div>
          <h2>
            Проектные блоки
            <small>{dateStr}</small>
          </h2>
          <p>Каждый блок завершается проверяемым артефактом.</p>
        </div>
        <button
          type="button"
          className={`mz-btn mz-btn--sm ${isAddingBlock ? '' : 'mz-btn--teal'}`}
          onClick={() => setIsAddingBlock(!isAddingBlock)}
        >
          {isAddingBlock ? <ChevronUp size={16} /> : <Plus size={16} />}
          {isAddingBlock ? 'Свернуть' : 'Проектный блок'}
        </button>
      </div>

      {isAddingBlock && (
        <form onSubmit={handleCreateSelfStudySlot} className="mz-panel mz-panel--teal mz-fade-in" style={{ marginBottom: 'var(--s5)' }}>
          <div className="mz-panel__title">
            <span className="mz-chip mz-chip--teal">Новый</span>
            Блок самостоятельной работы
          </div>
          <div className="mz-stack">
            <div className="mz-grid2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
              <label className="mz-field">
                <span className="mz-label">Проект / исследование</span>
                <input
                  type="text"
                  required
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Макет умной теплицы"
                  className="mz-input mz-input--teal"
                />
              </label>
              <label className="mz-field">
                <span className="mz-label">Время</span>
                <input
                  type="text"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  placeholder="10:00 – 12:30"
                  className="mz-input mz-input--teal mz-num"
                />
              </label>
            </div>
            <div className="mz-grid2">
              <label className="mz-field">
                <span className="mz-label">
                  Что делаю <em>шаги</em>
                </span>
                <input
                  type="text"
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  placeholder="Собрать датчик влажности, снять 20 замеров"
                  className="mz-input mz-input--teal"
                />
              </label>
              <label className="mz-field">
                <span className="mz-label">
                  Definition of Done <em>конечный артефакт</em>
                </span>
                <input
                  type="text"
                  required
                  value={projectDeliverable}
                  onChange={(e) => setProjectDeliverable(e.target.value)}
                  placeholder="График замеров + фото установки"
                  className="mz-input mz-input--teal"
                />
              </label>
            </div>
            <div className="mz-row mz-row--end">
              <button type="button" className="mz-link" onClick={() => setIsAddingBlock(false)}>
                Отмена
              </button>
              <button type="submit" className="mz-btn mz-btn--teal" disabled={isSubmitting}>
                {isSubmitting ? 'Сохраняю…' : 'Зафиксировать блок'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="mz-slots">
        {selfStudySlots.length === 0 ? (
          <div className="mz-empty">
            <Image src="/brand/intro.png" alt="" width={130} height={130} style={{ width: 'auto', height: 'auto' }} />
            <h3>Субботний блок ещё не заполнен</h3>
            <p>
              Пустой субботний блок две недели подряд появится у куратора как маркер риска «Empty Self-Study». Запланируй хотя бы
              один проект.
            </p>
            <button type="button" className="mz-btn mz-btn--primary" onClick={() => setIsAddingBlock(true)}>
              Спланировать самостоятельную работу
            </button>
          </div>
        ) : (
          selfStudySlots.map((slot) => {
            const isDone = slot.status === 'DONE';
            return (
              <div key={slot.id} className={`mz-slot ${isDone ? 'mz-slot--done' : ''}`}>
                <div className="mz-slot__time">
                  <b>{slot.startTime || '—'}</b>
                  <span>{slot.endTime || ''}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 className="mz-slot__title">
                    {slot.title}
                    {isDone && <span className="mz-chip mz-chip--teal">Сдано</span>}
                  </h3>
                  {slot.taskGoal && <p className="mz-slot__goal">{slot.taskGoal}</p>}
                  {slot.deliverable && (
                    <p className="mz-slot__dod">
                      <b>DoD</b>
                      {slot.deliverable}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className={`mz-seg__btn mz-seg__btn--done`}
                  aria-pressed={isDone}
                  onClick={() => handleToggleSlotStatus(slot.id, slot.status)}
                >
                  <CheckCircle2 size={16} /> {isDone ? 'Сдано' : 'Завершить'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
