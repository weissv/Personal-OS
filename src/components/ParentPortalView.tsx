'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, EyeOff, Eye, Heart, Lock, Send, Check, Camera, Mic } from 'lucide-react';
import { ViewHero, Notice, InlineAlert } from '@/components/ui';
import { apiFetch, mediaUrl } from '@/lib/api-client';
import { formatSchoolDate } from '@/lib/school-time';
import { ACCESS_LEVEL_LABEL, AccessLevel, DAY_NAMES, MediaAsset, WeekData } from '@/lib/types';
import { MediaPreviewModal } from './MediaPreviewModal';

interface ParentPortalViewProps {
  linkedChildren: Array<{ id: string; fullName: string; gradeLevel: number | null; accessLevel: AccessLevel }>;
  activeChildId: string | null;
  onSelectChild: (id: string) => void;
  studentName: string;
  accessLevel: AccessLevel;
  weekNumber: number;
  week: WeekData | null;
  onCommentSubmitted?: () => void;
}

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  DONE: { label: 'Готово', cls: 'mz-chip--teal' },
  MIGRATED: { label: 'Перенесено', cls: 'mz-chip--lav' },
  DROPPED: { label: 'Отменено', cls: 'mz-chip--error' },
  PENDING: { label: 'В работе', cls: 'mz-chip--peach' },
};

const LADDER: Array<{ key: AccessLevel; icon: React.ReactNode; cls: string }> = [
  { key: 'REVOKED', icon: <EyeOff size={14} aria-hidden="true" />, cls: 'revoked' },
  { key: 'SUMMARY_ONLY', icon: <Shield size={14} aria-hidden="true" />, cls: 'summary' },
  { key: 'FULL_ACCESS', icon: <Eye size={14} aria-hidden="true" />, cls: 'full' },
];

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  linkedChildren,
  activeChildId,
  onSelectChild,
  studentName,
  accessLevel,
  weekNumber,
  week,
  onCommentSubmitted,
}) => {
  const parentComment = week?.parentReview?.comment ?? null;
  const [commentText, setCommentText] = useState(parentComment || '');
  const [isEditing, setIsEditing] = useState(!parentComment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openAsset, setOpenAsset] = useState<MediaAsset | null>(null);

  const saturdaySlots = (week?.days.find((d) => d.dayOfWeek === 6)?.slots ?? []).filter((s) => !s.isGhost);
  const weekdays = (week?.days ?? [])
    .filter((d) => d.dayOfWeek <= 5)
    .map((d) => ({ ...d, slots: d.slots.filter((s) => !s.isGhost) }));
  const weekdayTasks = weekdays.flatMap((d) => d.slots);
  const doneTasks = weekdayTasks.filter((s) => s.status === 'DONE').length;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !week) return;
    const clean = commentText.trim();
    if (!clean) {
      setErrorMsg('Напишите пару слов поддержки перед отправкой.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = await apiFetch('/api/v1/parent/review', { method: 'POST', body: { weekId: week.id, comment: clean } });
    setIsSubmitting(false);
    if (res.ok) {
      setSuccessMsg('Слова поддержки сохранены — ученик увидит их в своей ретроспективе.');
      setIsEditing(false);
      onCommentSubmitted?.();
    } else {
      setErrorMsg(res.error);
    }
  };

  const label = ACCESS_LEVEL_LABEL[accessLevel];

  return (
    <div>
      {linkedChildren.length > 1 && (
        <nav className="mz-kids mz-gap-b" aria-label="Дети">
          {linkedChildren.map((c) => (
            <button
              key={c.id}
              type="button"
              className="mz-kids__item"
              aria-pressed={c.id === activeChildId}
              onClick={() => c.id !== activeChildId && onSelectChild(c.id)}
            >
              <b>{c.fullName}</b>
              <small>
                {c.gradeLevel ? `${c.gradeLevel} класс · ` : ''}
                {ACCESS_LEVEL_LABEL[c.accessLevel].title.toLowerCase()}
              </small>
            </button>
          ))}
        </nav>
      )}

      <ViewHero
        tag={`Кабинет родителя · ${studentName}`}
        title={
          <>
            Суверенное доверие: <span className="mz-hl">прозрачность</span> без тотального контроля
          </>
        }
        text={
          <>
            В модели Mezon подросток сам определяет, какую часть дневника видит семья. Это воспитывает внутреннюю
            ответственность, а не привычку жить под надзором.
          </>
        }
        mascot="intro"
        stats={[
          { value: label.title, label: 'уровень доступа' },
          { value: weekNumber, label: 'неделя спринта' },
          ...(accessLevel !== 'REVOKED' ? [{ value: saturdaySlots.length, unit: 'шт.', label: 'субботних проектов' }] : []),
        ]}
      />

      <section className="mz-gap-b-lg">
        <div className="mz-label">Уровень доверия, установленный учеником</div>
        <div className="mz-ladder" role="list" aria-label={`Текущий уровень: ${label.title}`}>
          {LADDER.map((l) => (
            <div key={l.key} role="listitem" className={accessLevel === l.key ? `on ${l.cls}` : ''} aria-current={accessLevel === l.key}>
              <span className="mz-ladder__title">
                {l.icon} {ACCESS_LEVEL_LABEL[l.key].title}
              </span>
              <small>{ACCESS_LEVEL_LABEL[l.key].hint}</small>
            </div>
          ))}
        </div>
      </section>

      {accessLevel === 'REVOKED' || !week ? (
        <div className="mz-empty mz-fade-in">
          <Image src="/brand/intro.png" alt="" width={140} height={140} className="mz-empty__img" />
          <span className="mz-chip mz-chip--error">
            <Lock size={12} /> Приватный режим
          </span>
          <h3>Ученик закрыл записи этой недели</h3>
          <p>
            В педагогике Mezon Inspiring School тотальный надзор исключён: субъектность формируется, когда подросток знает, что
            его дневник — безопасное пространство. Доступ можно обсудить вместе — решение остаётся за учеником.
          </p>
          <div className="mz-empty__note">
            <Notice tone="lav" icon={<Shield size={18} />}>
              Куратор класса сопровождает академический процесс в штатном режиме и обсуждает прогресс на еженедельных встречах.
            </Notice>
          </div>
        </div>
      ) : (
        <div className="mz-stack mz-stack--xl mz-fade-in">
          <div className="mz-anchor mz-anchor--flush">
            <div>
              <small>Фокус недели {week.weekNumber}</small>
              <p>{week.weekGoal || 'Освоение базовой программы и работа над проектным артефактом'}</p>
            </div>
            {week.deadlinesEvents && (
              <div>
                <small>Сроки и события</small>
                <p className="soft">{week.deadlinesEvents}</p>
              </div>
            )}
          </div>

          {accessLevel === 'FULL_ACCESS' && (
            <section className="mz-panel">
              <div className="mz-panel__title">
                <span className="mz-chip mz-chip--magenta">Будни</span>
                Уроки и задачи недели
                <span className="mz-panel__meta">
                  {doneTasks} из {weekdayTasks.length} выполнено
                </span>
              </div>
              {weekdayTasks.length === 0 ? (
                <p className="mz-muted">На этой неделе задачи ещё не активированы.</p>
              ) : (
                <div className="mz-weeklog">
                  {weekdays
                    .filter((d) => d.slots.length > 0)
                    .map((d) => (
                      <div key={d.id} className="mz-weeklog__day">
                        <div className="mz-weeklog__head">
                          <b>{DAY_NAMES[d.dayOfWeek]}</b>
                          <span>{formatSchoolDate(d.date)}</span>
                        </div>
                        <ul>
                          {d.slots.map((s) => {
                            const chip = STATUS_CHIP[s.status] ?? STATUS_CHIP.PENDING;
                            return (
                              <li key={s.id}>
                                <span className="mz-weeklog__time mz-num">{s.startTime || '—'}</span>
                                <span className="mz-weeklog__title">
                                  {s.title}
                                  {s.deliverable && <small>DoD: {s.deliverable}</small>}
                                </span>
                                <span className={`mz-chip ${chip.cls}`}>{chip.label}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

          <section className="mz-panel mz-panel--teal">
            <div className="mz-panel__title">
              <span className="mz-chip mz-chip--teal">Суббота</span>
              Проектный спринт (Self-Study)
              <span className="mz-panel__meta">{saturdaySlots.length} блоков</span>
            </div>
            {saturdaySlots.length > 0 ? (
              <div className="mz-slots">
                {saturdaySlots.map((s) => {
                  const isDone = s.status === 'DONE';
                  return (
                    <div key={s.id} className={`mz-slot mz-slot--compact ${isDone ? 'mz-slot--done' : ''}`}>
                      <div className="mz-slot__main">
                        <h4 className="mz-slot__title">
                          {s.title}
                          <span className={`mz-chip ${isDone ? 'mz-chip--teal' : 'mz-chip--peach'}`}>{isDone ? 'Сдано' : 'В работе'}</span>
                        </h4>
                        {s.deliverable && (
                          <p className="mz-slot__dod">
                            <b>DoD</b> {s.deliverable}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mz-muted">Субботние проектные блоки ещё не запланированы.</p>
            )}
          </section>

          <section className="mz-panel mz-panel--lav">
            <div className="mz-panel__title">
              <span className="mz-chip mz-chip--lav">Итоги</span>
              Воскресная рефлексия ученика
              {!week.isSubmitted && <span className="mz-panel__meta">ещё не сдана</span>}
            </div>
            <div className="mz-retro">
              <div>
                <b>01 · Что получилось</b>
                {week.retroSuccess || '— пока нет записи —'}
              </div>
              <div>
                <b>02 · Сложности и переносы</b>
                {week.retroBlockers || '— пока нет записи —'}
              </div>
              <div>
                <b>03 · Что изменится на следующей неделе</b>
                {week.retroNextPlan || '— пока нет записи —'}
              </div>
            </div>
          </section>

          {accessLevel === 'FULL_ACCESS' && week.mediaAssets.length > 0 && (
            <section className="mz-panel">
              <div className="mz-panel__title">
                <span className="mz-chip mz-chip--lav">Медиа</span>
                Конспекты и голосовые мысли
                <span className="mz-panel__meta">{week.mediaAssets.length}</span>
              </div>
              <div className="mz-media">
                {week.mediaAssets.map((asset) => {
                  const isImage = asset.fileType.startsWith('image');
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className="mz-media__item mz-media__item--clickable"
                      onClick={() => setOpenAsset(asset)}
                      aria-label={`Открыть: ${asset.note || asset.fileName}`}
                    >
                      <div className="mz-media__thumb">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(asset.fileUrl)} alt="" loading="lazy" />
                        ) : (
                          <div className="mz-media__thumb-fallback">
                            {isImage ? <Camera size={22} /> : <Mic size={24} />}
                            <span>Аудио</span>
                          </div>
                        )}
                      </div>
                      <div className="mz-media__meta">
                        <b>{asset.note || asset.fileName}</b>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mz-card mz-card--lav mz-card--white">
            <div className="mz-row mz-row--between mz-gap-b-sm">
              <div className="mz-row">
                <span className="mz-chip mz-chip--lav">
                  <Heart size={12} /> Зона поддержки семьи
                </span>
                <span className="mz-card__kicker">«Чем могу помочь?»</span>
              </div>
              {!isEditing && parentComment && (
                <button type="button" className="mz-link" onClick={() => setIsEditing(true)}>
                  Изменить
                </button>
              )}
            </div>

            {successMsg && (
              <div className="mz-gap-b-sm">
                <Notice icon={<Check size={16} />}>{successMsg}</Notice>
              </div>
            )}
            {errorMsg && (
              <div className="mz-gap-b-sm">
                <InlineAlert tone="error" onDismiss={() => setErrorMsg(null)}>
                  {errorMsg}
                </InlineAlert>
              </div>
            )}

            {!isEditing && parentComment ? (
              <p className="mz-quote mz-quote--italic">«{parentComment}»</p>
            ) : (
              <form onSubmit={handleSubmitComment} className="mz-stack">
                <label className="mz-field">
                  <span className="mz-label">Слова поддержки на эту неделю</span>
                  <textarea
                    rows={3}
                    required
                    maxLength={2000}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Мы гордимся твоим самостоятельным движением и готовы помочь с материалами для проекта!"
                    className="mz-textarea"
                  />
                </label>
                <div className="mz-row mz-row--end">
                  {parentComment && (
                    <button
                      type="button"
                      className="mz-link"
                      onClick={() => {
                        setCommentText(parentComment);
                        setIsEditing(false);
                      }}
                    >
                      Отмена
                    </button>
                  )}
                  <button type="submit" disabled={isSubmitting || !commentText.trim()} className="mz-btn mz-btn--primary mz-btn--sm">
                    <Send size={14} />
                    {isSubmitting ? 'Отправляю…' : 'Отправить поддержку'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {openAsset && <MediaPreviewModal asset={openAsset} onClose={() => setOpenAsset(null)} canDelete={false} />}
    </div>
  );
};
