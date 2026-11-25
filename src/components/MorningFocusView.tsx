'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Lock, ArrowRight, Check, ChevronDown, ChevronUp, CalendarX2 } from 'lucide-react';
import { ViewHero, Notice, InlineAlert, EmptyState } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';
import { formatCountdown, secondsUntilPhoneTurnIn } from '@/lib/school-time';
import type { DaySlot } from '@/lib/types';
import { DeleteSlotButton } from './DeleteSlotButton';

const MIN_INTENT = 3;

interface MorningFocusViewProps {
  dayId: string;
  dayTitle: string;
  dateStr: string;
  slots: DaySlot[];
  onSlotUpdated: () => void;
  onNavigateToEvening: () => void;
}

export const MorningFocusView: React.FC<MorningFocusViewProps> = ({
  dayId,
  dayTitle,
  dateStr,
  slots,
  onSlotUpdated,
  onNavigateToEvening,
}) => {
  // Реальный обратный отсчёт до сдачи телефона в 08:00 по Ташкенту
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntilPhoneTurnIn());

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
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(secondsUntilPhoneTurnIn()), 1000);
    return () => clearInterval(timer);
  }, []);
  const isBeforeTurnIn = secondsLeft > 0;
  // До 07:00 показывать «60 минут до вахты» бессмысленно — показываем время сдачи
  const countdownLabel = secondsLeft > 3600 ? '08:00' : isBeforeTurnIn ? formatCountdown(secondsLeft) : 'сдан';

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
    if (isSaving) return;
    const goal = taskGoalInput.trim();
    if (goal.length < MIN_INTENT) {
      setActionError(`Сформулируй интенцию урока — хотя бы ${MIN_INTENT} символа.`);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    const res = await apiFetch(`/api/v1/slots/${slotId}/activate`, {
      method: 'POST',
      body: { taskGoal: goal, deliverable: deliverableInput.trim() },
    });
    setIsSaving(false);
    if (res.ok) {
      setActiveSlotId(null);
      onSlotUpdated();
    } else {
      setActionError(res.error);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCustom) return;
    if (customTitle.trim().length < MIN_INTENT) {
      setActionError(`Название события — хотя бы ${MIN_INTENT} символа.`);
      return;
    }
    if (customStartTime && customEndTime && customEndTime <= customStartTime) {
      setActionError('Событие должно заканчиваться позже, чем начинается.');
      return;
    }
    setIsSubmittingCustom(true);
    setActionError(null);
    const res = await apiFetch('/api/v1/slots/custom', {
      method: 'POST',
      body: {
        dayId,
        title: customTitle.trim(),
        startTime: customStartTime || null,
        endTime: customEndTime || null,
        taskGoal: customGoal.trim(),
        deliverable: customDoD.trim(),
        type: 'CUSTOM_EVENT',
      },
    });
    setIsSubmittingCustom(false);
    if (res.ok) {
      setIsAddingCustomEvent(false);
      setCustomTitle('');
      setCustomGoal('');
      setCustomDoD('');
      onSlotUpdated();
    } else {
      setActionError(res.error);
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
          {
            value: countdownLabel,
            label: secondsLeft > 3600 ? 'сдача телефона' : isBeforeTurnIn ? 'до сдачи телефона' : 'телефон на вахте',
          },
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
        <form onSubmit={handleCreateCustomEvent} className="mz-panel mz-fade-in mz-gap-b">
          <div className="mz-panel__title">
            <span className="mz-chip mz-chip--magenta">Новое</span>
            Событие дня: перемена, студсовет, факультатив
          </div>
          <div className="mz-stack">
            <div className="mz-grid2 mz-grid2--wide-first">
              <label className="mz-field">
                <span className="mz-label">Название</span>
                <input
                  type="text"
                  required
                  maxLength={150}
                  className="mz-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Большая перемена: сбор студсовета"
                />
              </label>
              <div className="mz-field">
                <span className="mz-label">Время</span>
                <div className="mz-row mz-row--tight">
                  <input
                    type="time"
                    className="mz-input mz-num"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    aria-label="Начало"
                  />
                  <span aria-hidden="true">–</span>
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

      {actionError && (
        <div className="mz-gap-b">
          <InlineAlert tone="error" onDismiss={() => setActionError(null)}>
            {actionError}
          </InlineAlert>
        </div>
      )}

      {/* Слоты: цвет кромки = статус; пунктир = ghost-заготовка из расписания */}
      {slots.length === 0 && (
        <EmptyState
          icon={<CalendarX2 size={36} />}
          title="В этот день уроков нет"
          description="Добавь личное событие — кружок, студсовет или подготовку — и задай ему результат."
          actionText="Добавить событие"
          onAction={() => setIsAddingCustomEvent(true)}
        />
      )}

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
              <div className="mz-slot__time" onClick={() => handleSelectSlot(slot)} aria-hidden="true">
                <b>{slot.startTime || '—'}</b>
                <span>{slot.endTime || ''}</span>
              </div>

              <div className="mz-slot__main" onClick={() => handleSelectSlot(slot)}>
                <h3 className="mz-slot__title">
                  {slot.title}
                  {isGhost && <span className="mz-chip mz-chip--outline">Заготовка</span>}
                  {slot.type === 'CUSTOM_EVENT' && <span className="mz-chip mz-chip--lav">Событие</span>}
                  {!isGhost && slot.status === 'DONE' && <span className="mz-chip mz-chip--teal">Готово</span>}
                  {!isGhost && slot.status === 'MIGRATED' && <span className="mz-chip mz-chip--lav">Перенесено</span>}
                  {!isGhost && slot.status === 'DROPPED' && <span className="mz-chip mz-chip--error">Отменено</span>}
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
                    aria-expanded={isSelected}
                    aria-label={`Активировать: ${slot.title}`}
                  >
                    {isSelected ? 'Свернуть' : 'Активировать'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mz-link"
                    onClick={() => handleSelectSlot(slot)}
                    aria-expanded={isSelected}
                    aria-label={`${isSelected ? 'Свернуть' : 'Изменить'}: ${slot.title}`}
                  >
                    {isSelected ? 'Свернуть' : 'Изменить'} {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {/* Редактор на месте (Cooper: ноль модальных окон) */}
              {isSelected && (
                <form
                  className="mz-slot__editor mz-fade-in"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveSlotIntention(slot.id);
                  }}
                >
                  <label className="mz-field">
                    <span className="mz-label">
                      Что делаю на уроке <em>интенция</em>
                    </span>
                    <input
                      type="text"
                      className="mz-input"
                      value={taskGoalInput}
                      maxLength={1000}
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
                        maxLength={1000}
                        onChange={(e) => setDeliverableInput(e.target.value)}
                        placeholder="Черновик отчёта сдан учителю физики"
                      />
                    </label>
                    <div className="mz-suggest">
                      {dodSuggestions.map((sug) => (
                        <button key={sug} type="button" onClick={() => setDeliverableInput(sug)} aria-pressed={deliverableInput === sug}>
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mz-row mz-row--end">
                    {slot.type !== 'ACADEMIC_LESSON' && (
                      <span className="mz-push-left">
                        <DeleteSlotButton
                          slotId={slot.id}
                          title={slot.title}
                          onDeleted={() => {
                            setActiveSlotId(null);
                            onSlotUpdated();
                          }}
                          onError={setActionError}
                        />
                      </span>
                    )}
                    <button type="button" className="mz-link" onClick={() => setActiveSlotId(null)}>
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="mz-btn mz-btn--primary"
                      disabled={isSaving || taskGoalInput.trim().length < MIN_INTENT}
                    >
                      {isSaving ? 'Сохраняю…' : 'Зафиксировать'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* Главное действие экрана — одно и крупное (Cooper: transient posture) */}
      <div className="mz-gap-t">
        {isDayCommitted ? (
          <div className="mz-panel mz-panel--teal mz-fade-in">
            <Notice icon={<Check size={18} />}>
              <strong>Интенции зафиксированы ({activeSlotsCount}).</strong> Смартфон сдан на вахте до 16:30 — в течение дня ты
              действуешь по своим Definition of Done. Вечером — пакетный дебрифинг.
            </Notice>
            <div className="mz-row mz-gap-t-sm">
              <button type="button" className="mz-btn mz-btn--teal" onClick={onNavigateToEvening}>
                Перейти к вечеру <ArrowRight size={16} />
              </button>
              <button type="button" className="mz-link" onClick={() => setIsDayCommitted(false)}>
                Отменить и изменить
              </button>
            </div>
          </div>
        ) : (
          <div className="mz-actions-col">
            {activeSlotsCount === 0 && slots.length > 0 && (
              <p className="mz-hint">Активируй хотя бы один урок — так вечером будет что сверить с Definition of Done.</p>
            )}
            <button
              type="button"
              className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block"
              onClick={() => setIsDayCommitted(true)}
              disabled={activeSlotsCount === 0 && slots.length > 0}
            >
              <Lock size={18} /> Готов сдать смартфон (08:00) <ArrowRight size={18} />
            </button>
            <button type="button" className="mz-btn mz-btn--outline mz-btn--block mz-btn--quiet" onClick={onNavigateToEvening}>
              Перейти к вечернему дебрифингу →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
