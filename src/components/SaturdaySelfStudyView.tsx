'use client';

import React, { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Play, Pause, RotateCcw, ChevronUp, PartyPopper } from 'lucide-react';
import Image from 'next/image';
import { ViewHero, InlineAlert, Notice } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';
import { formatCountdown } from '@/lib/school-time';
import type { DaySlot } from '@/lib/types';
import { DeleteSlotButton } from './DeleteSlotButton';

const FOCUS_SECONDS = 90 * 60;
const MIN_TITLE = 3;

/** Таймер по отметкам времени: не «отстаёт» в фоновой вкладке и при блокировке экрана. */
function useFocusTimer(total: number) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(total);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setEndsAt(null);
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  return {
    remaining,
    isRunning: endsAt !== null,
    isFinished: endsAt === null && remaining === 0,
    start: () => setEndsAt(Date.now() + (remaining > 0 ? remaining : total) * 1000),
    pause: () => setEndsAt(null),
    reset: () => {
      setEndsAt(null);
      setRemaining(total);
    },
  };
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
  const timer = useFocusTimer(FOCUS_SECONDS);

  // Inline project block creation (Cooper: in-place, zero modal)
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [projectGoal, setProjectGoal] = useState('');
  const [projectDeliverable, setProjectDeliverable] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  const handleToggleSlotStatus = async (slotId: string, currentStatus: string) => {
    if (busySlotId) return;
    const nextStatus = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    setErrorMessage(null);
    setBusySlotId(slotId);
    const res = await apiFetch(`/api/v1/slots/${slotId}/status`, { method: 'POST', body: { status: nextStatus } });
    setBusySlotId(null);
    if (res.ok) onSlotUpdated();
    else setErrorMessage(res.error);
  };

  const handleCreateSelfStudySlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const title = projectTitle.trim();
    if (title.length < MIN_TITLE) {
      setErrorMessage(`Название проектного блока — не менее ${MIN_TITLE} символов.`);
      return;
    }
    if (!projectDeliverable.trim()) {
      setErrorMessage('Укажи Definition of Done — артефакт, по которому видно, что блок завершён.');
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setErrorMessage('Блок должен заканчиваться позже, чем начинается.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    const res = await apiFetch('/api/v1/slots/custom', {
      method: 'POST',
      body: {
        dayId,
        title,
        startTime: startTime || null,
        endTime: endTime || null,
        taskGoal: projectGoal.trim(),
        deliverable: projectDeliverable.trim(),
        type: 'SELF_STUDY',
      },
    });
    setIsSubmitting(false);
    if (res.ok) {
      setIsAddingBlock(false);
      setProjectTitle('');
      setProjectGoal('');
      setProjectDeliverable('');
      onSlotUpdated();
    } else {
      setErrorMessage(res.error);
    }
  };

  const selfStudySlots = slots.filter((s) => !s.isGhost);
  const doneCount = selfStudySlots.filter((s) => s.status === 'DONE').length;
  const elapsedPct = ((FOCUS_SECONDS - timer.remaining) / FOCUS_SECONDS) * 100;

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
        <div className="mz-gap-b">
          <InlineAlert tone="error" onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </InlineAlert>
        </div>
      )}

      {/* Таймер глубокого фокуса: технологичный тёмный блок Mezon */}
      <section className="mz-timer" aria-label="Таймер глубокого фокуса">
        <div className="mz-timer__clock">
          <span className="mz-chip mz-chip--teal">Deep Work · 90 мин</span>
          <div role="timer" aria-live="off" aria-label={`Осталось ${formatCountdown(timer.remaining)}`}>
            {formatCountdown(timer.remaining)}
          </div>
        </div>
        <div className="mz-stack mz-timer__controls">
          <div
            className="mz-bar mz-bar--tall mz-bar--on-dark"
            role="progressbar"
            aria-label="Прогресс фокус-блока"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(elapsedPct)}
          >
            <i style={{ width: `${elapsedPct}%` }} />
          </div>
          <div className="mz-row">
            <button
              type="button"
              className={`mz-btn ${timer.isRunning ? 'mz-btn--peach' : 'mz-btn--teal'}`}
              onClick={timer.isRunning ? timer.pause : timer.start}
            >
              {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
              {timer.isRunning ? 'Пауза' : timer.remaining < FOCUS_SECONDS && !timer.isFinished ? 'Продолжить' : 'Старт блока'}
            </button>
            <button type="button" className="mz-btn mz-btn--light" onClick={timer.reset} disabled={timer.remaining === FOCUS_SECONDS}>
              <RotateCcw size={14} /> Сбросить
            </button>
          </div>
        </div>
      </section>

      {timer.isFinished && (
        <div className="mz-gap-b">
          <Notice icon={<PartyPopper size={18} />}>
            <strong>90 минут глубокого фокуса позади.</strong> Сделай перерыв и отметь блок завершённым, если артефакт готов.
          </Notice>
        </div>
      )}

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
        <form onSubmit={handleCreateSelfStudySlot} className="mz-panel mz-panel--teal mz-fade-in mz-gap-b">
          <div className="mz-panel__title">
            <span className="mz-chip mz-chip--teal">Новый</span>
            Блок самостоятельной работы
          </div>
          <div className="mz-stack">
            <div className="mz-grid2 mz-grid2--wide-first">
              <label className="mz-field">
                <span className="mz-label">Проект / исследование</span>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Макет умной теплицы"
                  className="mz-input mz-input--teal"
                />
              </label>
              <div className="mz-field">
                <span className="mz-label">Время</span>
                <div className="mz-row mz-row--tight">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mz-input mz-input--teal mz-num"
                    aria-label="Начало блока"
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mz-input mz-input--teal mz-num"
                    aria-label="Конец блока"
                  />
                </div>
              </div>
            </div>
            <div className="mz-grid2">
              <label className="mz-field">
                <span className="mz-label">
                  Что делаю <em>шаги</em>
                </span>
                <input
                  type="text"
                  value={projectGoal}
                  maxLength={1000}
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
                  maxLength={1000}
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
            <Image src="/brand/intro.png" alt="" width={130} height={130} className="mz-empty__img" />
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
            const canToggle = slot.status === 'DONE' || slot.status === 'PENDING';
            return (
              <div key={slot.id} className={`mz-slot ${isDone ? 'mz-slot--done' : ''}`}>
                <div className="mz-slot__time">
                  <b>{slot.startTime || '—'}</b>
                  <span>{slot.endTime || ''}</span>
                </div>
                <div className="mz-slot__main">
                  <h3 className="mz-slot__title">
                    {slot.title}
                    {isDone && <span className="mz-chip mz-chip--teal">Сдано</span>}
                    {slot.status === 'MIGRATED' && <span className="mz-chip mz-chip--lav">Перенесено</span>}
                    {slot.status === 'DROPPED' && <span className="mz-chip mz-chip--error">Отменено</span>}
                  </h3>
                  {slot.taskGoal && <p className="mz-slot__goal">{slot.taskGoal}</p>}
                  {slot.deliverable && (
                    <p className="mz-slot__dod">
                      <b>DoD</b>
                      {slot.deliverable}
                    </p>
                  )}
                </div>
                <div className="mz-slot__actions mz-slot__actions--stack">
                {canToggle ? (
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--done"
                    aria-pressed={isDone}
                    disabled={busySlotId === slot.id}
                    onClick={() => handleToggleSlotStatus(slot.id, slot.status)}
                    title={isDone ? 'Нажми, чтобы вернуть блок в работу' : 'Артефакт готов'}
                  >
                    <CheckCircle2 size={16} /> {busySlotId === slot.id ? '…' : isDone ? 'Сдано' : 'Завершить'}
                  </button>
                ) : null}
                <DeleteSlotButton slotId={slot.id} title={slot.title} onDeleted={onSlotUpdated} onError={setErrorMessage} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
