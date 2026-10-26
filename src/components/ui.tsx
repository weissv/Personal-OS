'use client';

import React, { Component, ErrorInfo } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RotateCw } from 'lucide-react';

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
  <div className="mz-loading" role="status" aria-live="polite">
    <div className="mz-spinner" />
    <span>{label}</span>
  </div>
);

/* ==========================================================================
   JAPANESE KAIZEN & TPS COMPONENT EXTENSIONS (ZERO-DEFECT UI)
   ========================================================================== */

export interface InlineAlertProps {
  tone?: 'error' | 'warn' | 'ok' | 'lav';
  title?: string;
  children: React.ReactNode;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Andon Inline Alert: Заметное уведомление об отклонении или ошибке
 * с поддержкой ручного перезапуска операции (Retry).
 */
export const InlineAlert: React.FC<InlineAlertProps> = ({
  tone = 'error',
  title,
  children,
  onRetry,
  onDismiss,
}) => {
  const icon =
    tone === 'error' ? (
      <AlertCircle size={18} />
    ) : tone === 'warn' ? (
      <AlertTriangle size={18} />
    ) : tone === 'ok' ? (
      <CheckCircle2 size={18} />
    ) : (
      <Info size={18} />
    );

  return (
    <div className={`mz-alert mz-alert--${tone} mz-fade-in`} role="alert" aria-live="assertive">
      <div className="mz-alert__icon" aria-hidden="true">{icon}</div>
      <div className="mz-alert__body">
        {title && <strong className="mz-alert__title">{title}</strong>}
        <div className="mz-alert__content">{children}</div>
        {onRetry && (
          <div className="mz-alert__actions">
            <button type="button" className="mz-btn mz-btn--sm mz-btn--light" onClick={onRetry}>
              <RotateCw size={13} /> Повторить попытку
            </button>
            {onDismiss && (
              <button type="button" className="mz-link" onClick={onDismiss} style={{ fontSize: 13, marginLeft: 8 }}>
                Закрыть
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  mascot?: Mascot;
}

/**
 * Standardized Zero-Defect Empty State
 * Заменяет хаотичные inline-стилизованные блоки стандартным оформлением.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  mascot,
}) => (
  <div className="mz-empty-box mz-fade-in" role="region" aria-label={title}>
    {mascot ? (
      <div className="mz-empty-box__mascot" aria-hidden="true">
        <Image src={`/brand/${mascot}.png`} alt="" width={120} height={120} style={{ width: 'auto', height: 100 }} />
      </div>
    ) : icon ? (
      <div className="mz-empty-box__icon" aria-hidden="true">{icon}</div>
    ) : null}
    <h3 className="mz-empty-box__title">{title}</h3>
    <div className="mz-empty-box__desc">{description}</div>
    {actionText && onAction && (
      <div className="mz-empty-box__action">
        <button type="button" className="mz-btn mz-btn--primary mz-btn--sm" onClick={onAction}>
          {actionText}
        </button>
      </div>
    )}
  </div>
);

export interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  className?: string;
}

/**
 * Skeleton: Zero-CLS Placeholder (Cumulative Layout Shift = 0)
 * Предотвращает дергание макета во время загрузки данных.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  height = 20,
  width = '100%',
  borderRadius = 0,
  className = '',
}) => (
  <div
    className={`mz-skeleton ${className}`}
    style={{ height, width, borderRadius }}
    aria-hidden="true"
  />
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary (Poka-Yoke):
 * Предотвращает падение всего интерфейса в белый экран при неожиданной ошибке рендеринга.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled UI exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mz-error-boundary mz-fade-in" role="alert">
          <div className="mz-error-boundary__card">
            <span className="mz-chip mz-chip--error">Сбой интерфейса · Safe Catch</span>
            <h2>{this.props.fallbackTitle || 'Произошла непредвиденная ошибка'}</h2>
            <p>
              Интерфейс перехвачен барьером безопасности (Poka-Yoke Error Boundary). Ваши данные и состояние в базе сохранены.
            </p>
            {this.state.error && (
              <pre className="mz-error-boundary__trace">{this.state.error.message}</pre>
            )}
            <div className="mz-row" style={{ marginTop: 'var(--s5)' }}>
              <button type="button" className="mz-btn mz-btn--primary" onClick={this.handleReset}>
                <RotateCw size={15} /> Перезагрузить страницу
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
