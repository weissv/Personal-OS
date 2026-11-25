'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle, Award, Send, UserCheck, Check, Sparkles } from 'lucide-react';
import { ViewHero, Notice, InlineAlert } from '@/components/ui';
import { apiFetch } from '@/lib/api-client';
import { formatSchoolDateTime } from '@/lib/school-time';
import { ACCESS_LEVEL_LABEL, AccessLevel } from '@/lib/types';

interface WeeklyRetroViewProps {
  weekId: string;
  weekNumber: number;
  initialSuccess?: string | null;
  initialBlockers?: string | null;
  initialNextPlan?: string | null;
  isSubmitted: boolean;
  initialParentAccessLevel: AccessLevel;
  mentorReview?: {
    feedback: string;
    signedAt: string;
    mentor: {
      fullName: string;
    };
  } | null;
  parentReview?: {
    comment: string;
    signedAt: string;
  } | null;
  onRetroSubmitted: () => void;
}

const MIN_CHARS = 10;

interface RetroDraft {
  retroSuccess?: string;
  retroBlockers?: string;
  retroNextPlan?: string;
}

function readDraft(key: string): RetroDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as RetroDraft) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

interface QuestionProps {
  n: string;
  tone?: 'teal' | 'lav' | 'magenta';
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

/** Карточка вопроса: крупный номер (как индекс на лендинге), счётчик символов — полоской (Tufte). */
const Question: React.FC<QuestionProps> = ({ n, tone, title, hint, value, onChange, placeholder }) => {
  const len = value.trim().length;
  const short = len < MIN_CHARS;
  const hintId = `retro-q${n}-hint`;
  const cls = tone === 'magenta' ? 'mz-q mz-q--magenta' : tone === 'lav' ? 'mz-q mz-q--lav' : 'mz-q';
  return (
    <label className={`${cls} mz-q--block`}>
      <span className="mz-q__n" aria-hidden="true">
        {n}
      </span>
      <h3>{title}</h3>
      <textarea
        rows={3}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mz-textarea"
        maxLength={5000}
        aria-describedby={hintId}
        aria-invalid={short && len > 0}
      />
      <div className="mz-q__meter" id={hintId}>
        <span className={short && len > 0 ? 'mz-q__count mz-q__count--warn' : 'mz-q__count'}>
          {len} симв. {short ? `· минимум ${MIN_CHARS}` : '· хорошо'}
        </span>
        <div className={`mz-bar ${short ? 'mz-bar--warn' : ''}`}>
          <i style={{ width: `${Math.min(100, (len / MIN_CHARS) * 100)}%` }} />
        </div>
        <span>{hint}</span>
      </div>
    </label>
  );
};

export const WeeklyRetroView: React.FC<WeeklyRetroViewProps> = ({
  weekId,
  weekNumber,
  initialSuccess = '',
  initialBlockers = '',
  initialNextPlan = '',
  isSubmitted = false,
  initialParentAccessLevel = 'REVOKED',
  mentorReview,
  parentReview,
  onRetroSubmitted,
}) => {
  const DRAFT_KEY = `mezon_retro_draft_${weekId}`;

  // Черновик читается один раз при открытии недели (Poka-Yoke: ни одного потерянного ответа)
  const [draft] = useState(() => readDraft(DRAFT_KEY));
  const pick = (initial: string | null | undefined, fromDraft?: string) => (initial ? initial : fromDraft || '');

  const [retroSuccess, setRetroSuccess] = useState(() => pick(initialSuccess, draft?.retroSuccess));
  const [retroBlockers, setRetroBlockers] = useState(() => pick(initialBlockers, draft?.retroBlockers));
  const [retroNextPlan, setRetroNextPlan] = useState(() => pick(initialNextPlan, draft?.retroNextPlan));
  const [parentAccessLevel, setParentAccessLevel] = useState<AccessLevel>(initialParentAccessLevel);
  const [draftRestored, setDraftRestored] = useState(
    () =>
      !!draft &&
      ((!initialSuccess && !!draft.retroSuccess) ||
        (!initialBlockers && !!draft.retroBlockers) ||
        (!initialNextPlan && !!draft.retroNextPlan))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Последняя сохранённая на сервере версия — черновик пишется, только если есть отличия
  const savedRef = useRef({
    retroSuccess: initialSuccess || '',
    retroBlockers: initialBlockers || '',
    retroNextPlan: initialNextPlan || '',
  });

  useEffect(() => {
    const saved = savedRef.current;
    const dirty =
      retroSuccess !== saved.retroSuccess || retroBlockers !== saved.retroBlockers || retroNextPlan !== saved.retroNextPlan;
    try {
      if (dirty) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ retroSuccess, retroBlockers, retroNextPlan, timestamp: Date.now() }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // приватный режим — черновик просто не сохраняется
    }
  }, [DRAFT_KEY, retroSuccess, retroBlockers, retroNextPlan]);

  // Anti-sabotage validation checks (< 10 chars)
  const isSuccessShort = retroSuccess.trim().length > 0 && retroSuccess.trim().length < 10;
  const isBlockersShort = retroBlockers.trim().length > 0 && retroBlockers.trim().length < 10;
  const isNextPlanShort = retroNextPlan.trim().length > 0 && retroNextPlan.trim().length < 10;
  const hasSilentRetroWarning = isSuccessShort || isBlockersShort || isNextPlanShort;

  const filledCount = [retroSuccess, retroBlockers, retroNextPlan].filter((t) => t.trim().length >= MIN_CHARS).length;
  const hasEmpty = [retroSuccess, retroBlockers, retroNextPlan].some((t) => !t.trim());

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (isSubmitting) return;
    if (hasEmpty) {
      setSaveErrorMessage('Ответь на все три вопроса — даже коротко.');
      return;
    }
    setIsSubmitting(true);
    setSaveSuccessMsg(null);
    setSaveErrorMessage(null);
    const payload = {
      retroSuccess: retroSuccess.trim(),
      retroBlockers: retroBlockers.trim(),
      retroNextPlan: retroNextPlan.trim(),
    };
    const res = await apiFetch(`/api/v1/weeks/${weekId}/retro`, {
      method: 'PATCH',
      body: { ...payload, parentAccessLevel },
    });
    setIsSubmitting(false);
    if (res.ok) {
      savedRef.current = { retroSuccess, retroBlockers, retroNextPlan };
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setDraftRestored(false);
      setSaveSuccessMsg(isSubmitted ? 'Ретроспектива обновлена.' : 'Неделя закрыта — воскресная рефлексия зафиксирована.');
      onRetroSubmitted();
    } else {
      setSaveErrorMessage(`${res.error} Черновик сохранён на этом устройстве.`);
    }
  };

  const accessOptions: { key: AccessLevel; color: string; icon: React.ReactNode }[] = [
    { key: 'REVOKED', color: 'var(--error)', icon: <EyeOff size={16} /> },
    { key: 'SUMMARY_ONLY', color: 'var(--lav-d)', icon: <Shield size={16} /> },
    { key: 'FULL_ACCESS', color: 'var(--teal)', icon: <Eye size={16} /> },
  ];

  return (
    <div>
      <ViewHero
        tag={`Воскресенье · Неделя ${weekNumber}`}
        title={
          <>
            Ретроспектива: <span className="mz-hl">три вопроса</span> и ты свободен
          </>
        }
        text={
          <>
            <strong>10–15 минут</strong> на рефлексию по циклу Колба / Деминга: Plan → Do → Check → Act. Честный ответ короче
            не бывает — но и «норм» не считается.
          </>
        }
        mascot="art"
        stats={[
          { value: `${filledCount}/3`, label: 'ответов заполнено' },
          { value: isSubmitted ? 'закрыта' : 'ждёт', label: 'статус недели' },
        ]}
      />

      {saveSuccessMsg && (
        <div className="mz-gap-b">
          <Notice icon={<Check size={18} />}>{saveSuccessMsg}</Notice>
        </div>
      )}

      {draftRestored && (
        <div className="mz-gap-b">
          <Notice tone="lav" icon={<Sparkles size={18} />}>
            <strong>Черновик восстановлен.</strong> Незаконченные ответы сохранились на этом устройстве — можно продолжить.
          </Notice>
        </div>
      )}

      {saveErrorMessage && (
        <div className="mz-gap-b">
          <InlineAlert tone="error" onRetry={() => { handleSubmit(); }} onDismiss={() => setSaveErrorMessage(null)}>
            {saveErrorMessage}
          </InlineAlert>
        </div>
      )}

      {hasSilentRetroWarning && (
        <div className="mz-gap-b">
          <Notice tone="warn" icon={<AlertTriangle size={18} />}>
            <strong>Silent Retro.</strong> Ответы короче {MIN_CHARS} символов («норм», «ок») включают флаг ⚪ в мониторинге
            куратора. Сформулируй мысль развёрнуто.
          </Notice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mz-stack mz-stack--loose" noValidate>
        <Question
          n="01"
          title="Что получилось за эту неделю?"
          hint="победы и выполненные DoD"
          value={retroSuccess}
          onChange={setRetroSuccess}
          placeholder="Сдал черновик отчёта по оптике, провёл дебаты по Дьюи, в субботу собрал прототип автополива…"
        />
        <Question
          n="02"
          tone="lav"
          title="Что пришлось перенести и в чём реальная причина?"
          hint="перенесённое и почему"
          value={retroBlockers}
          onChange={setRetroBlockers}
          placeholder="Перенёс эссе по литературе на субботу, потому что недооценил время на турнир дебатов…"
        />
        <Question
          n="03"
          tone="magenta"
          title="Что изменю в стратегии на следующей неделе?"
          hint="PDCA · Act"
          value={retroNextPlan}
          onChange={setRetroNextPlan}
          placeholder="Буду брать не больше 2 ключевых задач в день и ставить жёсткий 30-минутный слот на академическое письмо…"
        />

        {/* Selective Trust: суверенный контроль приватности */}
        <section className="mz-panel mz-panel--lav">
          <div className="mz-panel__title">
            <span className="mz-chip mz-chip--lav">Приватность</span>
            Доступ родителей — решаешь ты
          </div>
          <p className="mz-panel__lead">
            Ты определяешь объём данных, открытый семье. Куратор видит неделю в рамках договора школы. Выбор применяется при
            сохранении ретроспективы.
          </p>
          <div className="mz-choice" role="group" aria-label="Уровень доступа родителей">
            {accessOptions.map((o) => (
              <button
                key={o.key}
                type="button"
                className="mz-choice__item"
                style={{ ['--c' as string]: o.color }}
                aria-pressed={parentAccessLevel === o.key}
                onClick={() => setParentAccessLevel(o.key)}
              >
                <b>
                  {o.icon} {ACCESS_LEVEL_LABEL[o.key].title}
                  {parentAccessLevel === o.key && <Check size={14} className="mz-push-right" />}
                </b>
                <p>{ACCESS_LEVEL_LABEL[o.key].hint}</p>
              </button>
            ))}
          </div>
        </section>

        <button type="submit" disabled={isSubmitting || hasEmpty} className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block">
          <Send size={18} />
          {isSubmitting ? 'Сохраняю…' : isSubmitted ? 'Обновить ретроспективу недели' : 'Зафиксировать и закрыть неделю'}
        </button>
      </form>

      {(mentorReview || parentReview) && (
        <section className="mz-gap-t-lg">
          <div className="mz-h2">
            <div>
              <h2>
                <Award size={22} className="mz-h2__icon" />
                Обратная связь
              </h2>
            </div>
          </div>
          <div className="mz-stack">
            {mentorReview && (
              <div className="mz-card mz-card--white">
                <div className="mz-row mz-row--between mz-gap-b-xs">
                  <span className="mz-chip mz-chip--magenta">
                    <UserCheck size={12} /> Куратор · {mentorReview.mentor.fullName}
                  </span>
                  <span className="mz-cell-sub mz-cell-sub--flush">
                    {formatSchoolDateTime(mentorReview.signedAt, { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <p className="mz-quote">«{mentorReview.feedback}»</p>
              </div>
            )}
            {parentReview && (
              <div className="mz-card mz-card--lav mz-card--white">
                <div className="mz-row mz-row--between mz-gap-b-xs">
                  <span className="mz-chip mz-chip--lav">
                    <Shield size={12} /> Комментарий родителя
                  </span>
                  <span className="mz-cell-sub mz-cell-sub--flush">
                    {formatSchoolDateTime(parentReview.signedAt, { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <p className="mz-quote">«{parentReview.comment}»</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
