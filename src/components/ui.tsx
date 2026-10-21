'use client';

import React from 'react';
import Image from 'next/image';

export type Mascot = 'fiz' | 'adm' | 'art' | 'intro';

interface HeroStat {
  value: string | number;
  unit?: string;
  label: string;
}

interface ViewHeroProps {
  tag: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  mascot?: Mascot;
  stats?: HeroStat[];
  children?: React.ReactNode;
}

/**
 * Hero экрана — тот же приём, что и первый экран mezon.uz:
 * B&W-фото под тёмной вуалью, смещённый магентовый квадрат, section-tag со штрихом,
 * h1 с подсвеченным фрагментом и маскот, «выпадающий» за нижнюю границу блока.
 * Цифры (Tufte): значение + единица крупно, подпись — вторым планом.
 */
export const ViewHero: React.FC<ViewHeroProps> = ({ tag, title, text, mascot = 'fiz', stats, children }) => (
  <section className="mz-hero">
    <div className="mz-hero__grid">
      <div>
        <div className="mz-tag mz-tag--peach">{tag}</div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
        {children}
      </div>
      <div className="mz-hero__mascot" aria-hidden="true">
        <Image src={`/brand/${mascot}.png`} alt="" width={230} height={230} priority style={{ height: '100%', width: 'auto' }} />
      </div>
    </div>
    {stats && stats.length > 0 && (
      <div className="mz-stats">
        {stats.map((s) => (
          <div className="mz-stat" key={s.label}>
            <b>
              {s.value}
              {s.unit && <i>{s.unit}</i>}
            </b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    )}
  </section>
);

interface NoticeProps {
  tone?: 'ok' | 'warn' | 'lav';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Notice: React.FC<NoticeProps> = ({ tone = 'ok', icon, children }) => (
  <div className={`mz-notice ${tone === 'warn' ? 'mz-notice--warn' : tone === 'lav' ? 'mz-notice--lav' : ''}`} role="status">
    {icon}
    <div>{children}</div>
  </div>
);

export const Loading: React.FC<{ label: string }> = ({ label }) => (
  <div className="mz-loading">
    <div className="mz-spinner" />
    <span>{label}</span>
  </div>
);
