'use client';

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle, Award, Send, UserCheck, Check } from 'lucide-react';
import { ViewHero, Notice } from '@/components/ui';

interface WeeklyRetroViewProps {
  weekId: string;
  weekNumber: number;
  initialSuccess?: string | null;
  initialBlockers?: string | null;
  initialNextPlan?: string | null;
  isSubmitted: boolean;
  initialParentAccessLevel: 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
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
  const len = value.length;
  const short = len < MIN_CHARS;
  const cls = tone === 'magenta' ? 'mz-q mz-q--magenta' : tone === 'lav' ? 'mz-q mz-q--lav' : 'mz-q';
  return (
    <label className={cls} style={{ display: 'block' }}>
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
        aria-describedby={`${n}-hint`}
      />
      <div className="mz-q__meter" id={`${n}-hint`}>
        <span style={{ color: short && len > 0 ? '#b87a1c' : undefined, fontWeight: short && len > 0 ? 700 : 400 }}>
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
  const [retroSuccess, setRetroSuccess] = useState(initialSuccess || '');
  const [retroBlockers, setRetroBlockers] = useState(initialBlockers || '');
  const [retroNextPlan, setRetroNextPlan] = useState(initialNextPlan || '');
  const [parentAccessLevel, setParentAccessLevel] = useState<'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS'>(
    initialParentAccessLevel
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Anti-sabotage validation checks (< 10 chars)
  const isSuccessShort = retroSuccess.trim().length > 0 && retroSuccess.trim().length < 10;
  const isBlockersShort = retroBlockers.trim().length > 0 && retroBlockers.trim().length < 10;
  const isNextPlanShort = retroNextPlan.trim().length > 0 && retroNextPlan.trim().length < 10;
  const hasSilentRetroWarning = isSuccessShort || isBlockersShort || isNextPlanShort;

  const filledCount = [retroSuccess, retroBlockers, retroNextPlan].filter((t) => t.trim().length >= MIN_CHARS).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/weeks/${weekId}/retro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retroSuccess,
          retroBlockers,
          retroNextPlan,
          parentAccessLevel,
        }),
      });

      if (res.ok) {
        setSaveSuccessMsg('Воскресная рефлексия зафиксирована.');
        onRetroSubmitted();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const accessOptions: {
    key: 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
    color: string;
    icon: React.ReactNode;
    text: string;
  }[] = [
    { key: 'REVOKED', color: 'var(--error)', icon: <EyeOff size={16} />, text: 'Доступ закрыт. Родитель ничего не видит.' },
    {
      key: 'SUMMARY_ONLY',
      color: 'var(--lav-d)',
      icon: <Shield size={16} />,
      text: 'Видны цели, субботний проект и итоги — без лога уроков.',
    },
    { key: 'FULL_ACCESS', color: 'var(--teal)', icon: <Eye size={16} />, text: 'Полный доступ ко всем слотам и артефактам недели.' },
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
        <div style={{ marginBottom: 'var(--s5)' }}>
          <Notice icon={<Check size={18} />}>{saveSuccessMsg}</Notice>
        </div>
      )}

      {hasSilentRetroWarning && (
        <div style={{ marginBottom: 'var(--s5)' }}>
          <Notice tone="warn" icon={<AlertTriangle size={18} />}>
            <strong>Silent Retro.</strong> Ответы короче {MIN_CHARS} символов («норм», «ок») включают флаг ⚪ в мониторинге
            куратора. Сформулируй мысль развёрнуто.
          </Notice>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mz-stack" style={{ gap: 'var(--s5)' }}>
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
          <p style={{ marginTop: 0, marginBottom: 'var(--s4)', fontSize: 14 }}>
            Ты определяешь объём данных, открытый семье. Куратор видит неделю в рамках договора школы.
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
                  {o.icon} {o.key}
                  {parentAccessLevel === o.key && <Check size={14} style={{ marginLeft: 'auto' }} />}
                </b>
                <p>{o.text}</p>
              </button>
            ))}
          </div>
        </section>

        <button type="submit" disabled={isSubmitting} className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block">
          <Send size={18} />
          {isSubmitting ? 'Сохраняю…' : isSubmitted ? 'Обновить ретроспективу недели' : 'Зафиксировать и закрыть неделю'}
        </button>
      </form>

      {(mentorReview || parentReview) && (
        <section style={{ marginTop: 'var(--s7)' }}>
          <div className="mz-h2">
            <div>
              <h2>
                <Award size={22} style={{ display: 'inline', marginRight: 8, color: 'var(--magenta)' }} />
                Обратная связь
              </h2>
            </div>
          </div>
          <div className="mz-stack">
            {mentorReview && (
              <div className="mz-card mz-card--white">
                <div className="mz-row mz-row--between" style={{ marginBottom: 'var(--s2)' }}>
                  <span className="mz-chip mz-chip--magenta">
                    <UserCheck size={12} /> Куратор · {mentorReview.mentor.fullName}
                  </span>
                  <span className="mz-cell-sub" style={{ marginTop: 0 }}>
                    {new Date(mentorReview.signedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 16, color: 'var(--dark)' }}>«{mentorReview.feedback}»</p>
              </div>
            )}
            {parentReview && (
              <div className="mz-card mz-card--lav mz-card--white">
                <div className="mz-row mz-row--between" style={{ marginBottom: 'var(--s2)' }}>
                  <span className="mz-chip mz-chip--lav">
                    <Shield size={12} /> Комментарий родителя
                  </span>
                  <span className="mz-cell-sub" style={{ marginTop: 0 }}>
                    {new Date(parentReview.signedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 16, color: 'var(--dark)' }}>«{parentReview.comment}»</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
