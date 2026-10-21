'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Lock, ArrowRight, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ViewHero, Notice } from '@/components/ui';

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

interface MorningFocusViewProps {
  dayId: string;
  dayTitle: string;
  dateStr: string;
  slots: DaySlot[];
  weekGoal?: string | null;
  onSlotUpdated: () => void;
  onNavigateToEvening: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const MorningFocusView: React.FC<MorningFocusViewProps> = ({
  dayId,
  dayTitle,
  dateStr,
  slots,
  onSlotUpdated,
  onNavigateToEvening,
}) => {
  // Обратный отсчёт до сдачи телефона в 08:00 (табличные цифры)
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({
    minutes: 18,
    seconds: 45,
  });

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [taskGoalInput, setTaskGoalInput] = useState('');
  const [deliverableInput, setDeliverableInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cooper: подтверждение без модального окна
  const [isDayCommitted, setIsDayCommitted] = useState(false);

  // Инлайн-создание личного события
  const [isAddingCustomEvent, setIsAddingCustomEvent] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customStartTime, setCustomStartTime] = useState('13:15');
  const [customEndTime, setCustomEndTime] = useState('13:50');
  const [customGoal, setCustomGoal] = useState('');
  const [customDoD, setCustomDoD] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return { minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectSlot = (slot: DaySlot) => {
    if (activeSlotId === slot.id) {
      setActiveSlotId(null);
      return;
    }
    setActiveSlotId(slot.id);
    setTaskGoalInput(slot.taskGoal || '');
    setDeliverableInput(slot.deliverable || '');
  };

  const handleSaveSlotIntention = async (slotId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/slots/${slotId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskGoal: taskGoalInput,
          deliverable: deliverableInput,
        }),
      });
      if (res.ok) {
        onSlotUpdated();
        setActiveSlotId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    setIsSubmittingCustom(true);
    try {
      const res = await fetch('/api/v1/slots/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId,
          title: customTitle,
          startTime: customStartTime,
          endTime: customEndTime,
          taskGoal: customGoal,
          deliverable: customDoD,
          type: 'CUSTOM_EVENT',
        }),
      });
      if (res.ok) {
        onSlotUpdated();
        setIsAddingCustomEvent(false);
        setCustomTitle('');
        setCustomGoal('');
        setCustomDoD('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const dodSuggestions = [
    'Сдать черновик отчета учителю',
    '3 решенные олимпиадные задачи',
    'Защитить тезис перед группой',
    'Утвердить план у куратора',
  ];

  const ghostSlotsCount = slots.filter((s) => s.isGhost).length;
  const activeSlotsCount = slots.filter((s) => !s.isGhost).length;

  return (
    <div>
      <ViewHero
        tag="07:30 – 08:15 · Утренний фокус"
        title={
          <>
            Назови <span className="mz-hl">интенции</span> дня до сдачи телефона
          </>
        }
        text={
          <>
            <strong>60–90 секунд.</strong> Активируй урок, впиши, что делаешь, и как поймёшь, что готово (Definition of Done).
            В 08:00 телефон остаётся на вахте — дальше ты действуешь автономно.
          </>
        }
        mascot="fiz"
        stats={[
          { value: `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`, label: 'до сдачи телефона' },
          { value: activeSlotsCount, unit: 'шт.', label: 'активировано' },
          { value: ghostSlotsCount, unit: 'шт.', label: 'ждут активации' },
        ]}
      />

      <div className="mz-h2">
        <div>
          <h2>
            {dayTitle}
            <small>{dateStr}</small>
          </h2>
          <p>Нажми на урок — задача и результат записываются прямо в строке.</p>
        </div>
        <button
          type="button"
          className={`mz-btn mz-btn--sm ${isAddingCustomEvent ? '' : 'mz-btn--peach'}`}
          onClick={() => setIsAddingCustomEvent(!isAddingCustomEvent)}
        >
          {isAddingCustomEvent ? <ChevronUp size={16} /> : <Plus size={16} />}
          {isAddingCustomEvent ? 'Свернуть' : 'Личное событие'}
        </button>
      </div>

      {isAddingCustomEvent && (
        <form onSubmit={handleCreateCustomEvent} className="mz-panel mz-fade-in" style={{ marginBottom: 'var(--s5)' }}>
          <div className="mz-panel__title">
            <span className="mz-chip mz-chip--magenta">Новое</span>
            Событие дня: перемена, студсовет, факультатив
          </div>
          <div className="mz-stack">
            <div className="mz-grid2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
              <label className="mz-field">
                <span className="mz-label">Название</span>
                <input
                  type="text"
                  required
                  className="mz-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Большая перемена: сбор студсовета"
                />
              </label>
              <div className="mz-field">
                <span className="mz-label">Время</span>
                <div className="mz-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                  <input
                    type="time"
                    className="mz-input mz-num"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    aria-label="Начало"
                  />
                  <span>–</span>
                  <input
                    type="time"
                    className="mz-input mz-num"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    aria-label="Конец"
                  />
                </div>
              </div>
            </div>
            <div className="mz-grid2">
              <label className="mz-field">
                <span className="mz-label">Что буду делать</span>
                <input
                  type="text"
                  className="mz-input"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="Согласовать таймлайн ярмарки проектов"
                />
              </label>
              <label className="mz-field">
                <span className="mz-label">Результат (DoD)</span>
                <input
                  type="text"
                  className="mz-input mz-input--teal"
                  value={customDoD}
                  onChange={(e) => setCustomDoD(e.target.value)}
                  placeholder="Таймлайн утверждён"
                />
              </label>
            </div>
            <div className="mz-row mz-row--end">
              <button type="button" className="mz-link" onClick={() => setIsAddingCustomEvent(false)}>
                Отмена
              </button>
              <button type="submit" className="mz-btn mz-btn--primary" disabled={isSubmittingCustom}>
                {isSubmittingCustom ? 'Добавляю…' : 'Добавить событие'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Слоты: цвет кромки = статус; пунктир = ghost-заготовка из расписания */}
      <div className="mz-slots">
        {slots.map((slot) => {
          const isSelected = activeSlotId === slot.id;
          const isGhost = slot.isGhost;
          const cls = [
            'mz-slot',
            isGhost ? 'mz-slot--ghost' : slot.status === 'DONE' ? 'mz-slot--done' : '',
            isSelected ? 'mz-slot--open' : 'mz-slot--clickable',
          ].join(' ');

          return (
            <div key={slot.id} className={cls}>
              <div
                className="mz-slot__time"
                onClick={() => handleSelectSlot(slot)}
                style={{ cursor: 'pointer' }}
              >
                <b>{slot.startTime || '00:00'}</b>
                <span>{slot.endTime || '00:00'}</span>
              </div>

              <div onClick={() => handleSelectSlot(slot)} style={{ cursor: 'pointer', minWidth: 0 }}>
                <h3 className="mz-slot__title">
                  {slot.title}
                  {isGhost && <span className="mz-chip mz-chip--outline">Заготовка</span>}
                  {slot.type === 'CUSTOM_EVENT' && <span className="mz-chip mz-chip--lav">Событие</span>}
                  {!isGhost && slot.status === 'DONE' && <span className="mz-chip mz-chip--teal">Готово</span>}
                </h3>
                {slot.taskGoal && <p className="mz-slot__goal">{slot.taskGoal}</p>}
                {!isGhost && !isSelected && slot.deliverable && (
                  <p className="mz-slot__dod">
                    <b>DoD</b>
                    {slot.deliverable}
                  </p>
                )}
              </div>

              <div>
                {isGhost ? (
                  <button
                    type="button"
                    className="mz-btn mz-btn--sm mz-btn--primary"
                    onClick={() => handleSelectSlot(slot)}
                  >
                    Активировать
                  </button>
                ) : (
                  <button type="button" className="mz-link" onClick={() => handleSelectSlot(slot)}>
                    {isSelected ? 'Свернуть' : 'Изменить'} {isSelected ? <ChevronUp size={14} style={{ display: 'inline' }} /> : <ChevronDown size={14} style={{ display: 'inline' }} />}
                  </button>
                )}
              </div>

              {/* Редактор на месте (Cooper: ноль модальных окон) */}
              {isSelected && (
                <div className="mz-slot__editor mz-fade-in">
                  <label className="mz-field">
                    <span className="mz-label">
                      Что делаю на уроке <em>интенция</em>
                    </span>
                    <input
                      type="text"
                      className="mz-input"
                      value={taskGoalInput}
                      onChange={(e) => setTaskGoalInput(e.target.value)}
                      placeholder="Лабораторная по оптике: собрать установку и сделать замеры"
                      autoFocus
                    />
                  </label>

                  <div className="mz-field">
                    <label>
                      <span className="mz-label">
                        Как пойму, что готово <em>Definition of Done</em>
                      </span>
                      <input
                        type="text"
                        className="mz-input mz-input--teal"
                        value={deliverableInput}
                        onChange={(e) => setDeliverableInput(e.target.value)}
                        placeholder="Черновик отчёта сдан учителю физики"
                      />
                    </label>
                    <div className="mz-suggest">
                      {dodSuggestions.map((sug) => (
                        <button key={sug} type="button" onClick={() => setDeliverableInput(sug)}>
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mz-row mz-row--end">
                    <button type="button" className="mz-link" onClick={() => setActiveSlotId(null)}>
                      Отмена
                    </button>
                    <button
                      type="button"
                      className="mz-btn mz-btn--primary"
                      disabled={isSaving}
                      onClick={() => handleSaveSlotIntention(slot.id)}
                    >
                      {isSaving ? 'Сохраняю…' : 'Зафиксировать'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Главное действие экрана — одно и крупное (Cooper: transient posture) */}
      <div style={{ marginTop: 'var(--s6)' }}>
        {isDayCommitted ? (
          <div className="mz-panel mz-panel--teal mz-fade-in">
            <Notice icon={<Check size={18} />}>
              <strong>Интенции зафиксированы.</strong> Смартфон сдан на вахте до 16:30 — в течение дня ты действуешь по своим
              Definition of Done. Вечером — пакетный дебрифинг.
            </Notice>
            <div className="mz-row" style={{ marginTop: 'var(--s4)' }}>
              <button type="button" className="mz-btn mz-btn--teal" onClick={onNavigateToEvening}>
                Перейти к вечеру <ArrowRight size={16} />
              </button>
              <button type="button" className="mz-link" onClick={() => setIsDayCommitted(false)}>
                Отменить и изменить
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block" onClick={() => setIsDayCommitted(true)}>
            <Lock size={18} /> Готов сдать смартфон (08:00) <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
