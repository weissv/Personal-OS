'use client';

import React from 'react';
import { Shield, EyeOff, Eye, Calendar, Heart, Lock } from 'lucide-react';
import Image from 'next/image';
import { ViewHero, Notice } from '@/components/ui';

interface ParentPortalViewProps {
  studentName: string;
  accessLevel: 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
  weekNumber: number;
  weekGoal?: string | null;
  retroSuccess?: string | null;
  retroBlockers?: string | null;
  retroNextPlan?: string | null;
  saturdaySlots: Array<{
    id: string;
    title: string;
    deliverable: string | null;
    status: string;
  }>;
  parentComment?: string | null;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({
  studentName,
  accessLevel,
  weekNumber,
  weekGoal,
  retroSuccess,
  retroBlockers,
  retroNextPlan,
  saturdaySlots,
  parentComment,
}) => {
  const accessLevelLabel =
    accessLevel === 'REVOKED'
      ? 'Доступ закрыт (REVOKED)'
      : accessLevel === 'SUMMARY_ONLY'
      ? 'Сводка недели (SUMMARY_ONLY)'
      : 'Полный доступ (FULL_ACCESS)';

  return (
    <div>
      <ViewHero
        tag={`Кабинет Родителя · ${studentName}`}
        title={
          <>
            Суверенное доверие: <span className="mz-hl">прозрачность</span> без тотального контроля
          </>
        }
        text={
          <>
            В модели Mezon подросток сам определяет уровень доступа к записям (Selective Trust RBAC). Это воспитывает внутреннюю
            ответственность, а не привычку жить под надзором.
          </>
        }
        mascot="intro"
        stats={[
          { value: accessLevel, label: 'режим доступа' },
          { value: `Неделя ${weekNumber}`, label: 'текущий спринт' },
          { value: saturdaySlots.length, unit: 'шт.', label: 'субботних проектов' },
        ]}
      />

      {/* Шкала доверия (Ladder of Trust) */}
      <section style={{ marginBottom: 'var(--s6)' }}>
        <div className="mz-label" style={{ marginBottom: 'var(--s2)' }}>
          Уровень доверия, установленный учеником
        </div>
        <div className="mz-ladder" role="status" aria-label={`Текущий уровень: ${accessLevel}`}>
          <div className={accessLevel === 'REVOKED' ? 'on revoked' : ''}>
            <EyeOff size={14} style={{ display: 'inline', marginRight: 6 }} />
            REVOKED
            <small>Закрыто от родителей</small>
          </div>
          <div className={accessLevel === 'SUMMARY_ONLY' ? 'on summary' : ''}>
            <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
            SUMMARY_ONLY
            <small>Цели и проекты субботы</small>
          </div>
          <div className={accessLevel === 'FULL_ACCESS' ? 'on full' : ''}>
            <Eye size={14} style={{ display: 'inline', marginRight: 6 }} />
            FULL_ACCESS
            <small>Все уроки и конспекты</small>
          </div>
        </div>
      </section>

      {/* Состояние 1: REVOKED */}
      {accessLevel === 'REVOKED' && (
        <div className="mz-empty mz-fade-in">
          <Image src="/brand/intro.png" alt="" width={140} height={140} style={{ width: 'auto', height: 'auto' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span className="mz-chip mz-chip--error">
              <Lock size={12} /> Приватный режим
            </span>
          </div>
          <h3>Доступ к записям этой недели закрыт учеником</h3>
          <p>
            В педагогической концепции Mezon Inspiring School тотальный надзор исключён: субъектность формируется, когда подросток
            знает, что его дневник — безопасное пространство.
          </p>
          <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'left' }}>
            <Notice tone="lav" icon={<Shield size={18} />}>
              Куратор класса сопровождает академический процесс в штатном режиме и обсуждает прогресс на еженедельных встречах.
            </Notice>
          </div>
        </div>
      )}

      {/* Состояние 2: SUMMARY_ONLY или FULL_ACCESS */}
      {accessLevel !== 'REVOKED' && (
        <div className="mz-stack mz-fade-in" style={{ gap: 'var(--s6)' }}>
          {/* Главная цель недели (Anchor) */}
          <div className="mz-anchor" style={{ margin: 0 }}>
            <div>
              <small>Фокус недели {weekNumber}</small>
              <p>{weekGoal || 'Освоение базовой программы и работа над проектным артефактом'}</p>
            </div>
          </div>

          {/* Субботний проектный спринт */}
          <section className="mz-panel mz-panel--teal">
            <div className="mz-panel__title">
              <span className="mz-chip mz-chip--teal">Суббота</span>
              Проектный спринт (Self-Study)
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: 'var(--text-soft)', textTransform: 'none', letterSpacing: 0 }}>
                {saturdaySlots.length} артефактов
              </span>
            </div>

            {saturdaySlots.length > 0 ? (
              <div className="mz-slots">
                {saturdaySlots.map((s) => {
                  const isDone = s.status === 'DONE';
                  return (
                    <div key={s.id} className={`mz-slot ${isDone ? 'mz-slot--done' : ''}`} style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                      <div style={{ minWidth: 0 }}>
                        <h4 className="mz-slot__title" style={{ fontSize: 15 }}>
                          {s.title}
                          {isDone ? (
                            <span className="mz-chip mz-chip--teal">✓ Сдано</span>
                          ) : (
                            <span className="mz-chip mz-chip--peach">В работе</span>
                          )}
                        </h4>
                        {s.deliverable && (
                          <p className="mz-slot__dod">
                            <b>DoD</b> {s.deliverable}
                          </p>
                        )}
                      </div>
                      <span className="mz-cell-sub" style={{ marginTop: 0 }}>
                        {isDone ? 'Артефакт принят' : 'Ожидает сдачи'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-soft)', fontStyle: 'italic' }}>
                Субботние проектные слоты ещё не заполнены учеником.
              </p>
            )}
          </section>

          {/* Итоги недели (Воскресная рефлексия) */}
          <section className="mz-panel mz-panel--lav">
            <div className="mz-panel__title">
              <span className="mz-chip mz-chip--lav">Итоги</span>
              Воскресная рефлексия ученика
            </div>
            <div className="mz-retro">
              <div>
                <b>01 · Успехи и выполненные задачи</b>
                {retroSuccess || '— нет данных —'}
              </div>
              <div>
                <b>02 · Сложности и переносы</b>
                {retroBlockers || '— нет данных —'}
              </div>
              <div>
                <b>03 · План изменений на следующую неделю</b>
                {retroNextPlan || '— нет данных —'}
              </div>
            </div>
          </section>

          {/* Зона поддержки семьи */}
          <section className="mz-card mz-card--lav mz-card--white">
            <div className="mz-row" style={{ marginBottom: 'var(--s2)' }}>
              <span className="mz-chip mz-chip--lav">
                <Heart size={12} /> Зона поддержки семьи
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)' }}>
                «Чем могу помочь?»
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--dark)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {parentComment ||
                '«Мы гордимся твоим самостоятельным движением и готовы поддержать с материалами для исследовательского проекта на выходных!»'}
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
