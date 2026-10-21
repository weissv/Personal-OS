'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface MezonCoverViewProps {
  studentName: string;
  gradeLevel: number | string;
  onOpenSpread: () => void;
}

export const MezonCoverView: React.FC<MezonCoverViewProps> = ({
  studentName,
  gradeLevel,
  onOpenSpread,
}) => {
  const parts = studentName.trim().split(' ');
  const lastName = parts[0] || 'Рахимов';
  const firstName = parts.slice(1).join(' ') || 'Даврон';

  return (
    <div style={{ padding: 'var(--s6) 0' }}>
      <div className="mz-cover">
        {/* Фирменный конструктивистский арт Mezon */}
        <div className="mz-cover__art" aria-hidden="true">
          <Image
            src="/brand/intro.png"
            alt=""
            width={480}
            height={520}
            style={{ width: 'auto', height: '100%', objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Шапка обложки: логотип Mezon Inspiring School */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Image src="/brand/logo.png" alt="Mezon" width={42} height={42} />
            <div>
              <b style={{ display: 'block', fontSize: 16, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--dark)' }}>
                MEZON
              </b>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
                Inspiring School
              </span>
            </div>
          </div>
          <span className="mz-chip mz-chip--magenta">Personal OS · 2026–2027</span>
        </div>

        {/* Центр: заголовок и формуляр ученика */}
        <div style={{ position: 'relative', zIndex: 1, margin: 'var(--s8) 0' }}>
          <div className="mz-tag mz-tag--peach" style={{ marginBottom: 'var(--s3)' }}>
            Спринт-навигатор
          </div>
          <h1>
            Ежедневник <br />
            <span className="mz-hl">автономии</span>
          </h1>

          <div style={{ marginTop: 'var(--s6)' }}>
            <div className="mz-cover__line">
              <span>Класс</span>
              <span className="fill" style={{ maxWidth: 90 }}>
                {gradeLevel || '9'}
              </span>
            </div>
            <div className="mz-cover__line">
              <span>Фамилия</span>
              <span className="fill">{lastName}</span>
            </div>
            <div className="mz-cover__line">
              <span>Имя</span>
              <span className="fill">{firstName}</span>
            </div>
          </div>

          <div style={{ marginTop: 'var(--s6)', fontSize: 13, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Ташкент · Узбекистан · mezon.uz
          </div>
        </div>

        {/* Подвал: цитата Джона Дьюи + кнопка входа */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 'var(--s5)',
            paddingTop: 'var(--s5)',
            borderTop: '2px solid var(--gray)',
          }}
        >
          <div style={{ maxWidth: 440 }}>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: 14, color: 'var(--dark)', lineHeight: 1.6 }}>
              «Образование — это не подготовка к жизни; образование — это сама жизнь.»
            </p>
            <span style={{ display: 'block', marginTop: 4, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-soft)', textTransform: 'uppercase' }}>
              — Джон Дьюи
            </span>
          </div>

          <button
            type="button"
            className="mz-btn mz-btn--primary mz-btn--lg"
            onClick={onOpenSpread}
          >
            Открыть разворот недели <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
