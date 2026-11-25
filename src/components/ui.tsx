'use client';

import React, { Component, ErrorInfo, useEffect, useId, useRef } from 'react';
import Image from 'next/image';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RotateCw, X } from 'lucide-react';

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
        <Image src={`/brand/${mascot}.png`} alt="" width={207} height={230} priority className="mz-hero__mascot-img" />
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

  const isProblem = tone === 'error' || tone === 'warn';
  return (
    <div
      className={`mz-alert mz-alert--${tone} mz-fade-in`}
      role={isProblem ? 'alert' : 'status'}
      aria-live={isProblem ? 'assertive' : 'polite'}
    >
      <div className="mz-alert__icon" aria-hidden="true">{icon}</div>
      <div className="mz-alert__body">
        {title && <strong className="mz-alert__title">{title}</strong>}
        <div className="mz-alert__content">{children}</div>
        {onRetry && (
          <div className="mz-alert__actions">
            <button type="button" className="mz-btn mz-btn--sm mz-btn--light" onClick={onRetry}>
              <RotateCw size={13} /> Повторить попытку
            </button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="mz-alert__close" onClick={onDismiss} aria-label="Скрыть сообщение">
          <X size={16} />
        </button>
      )}
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
        <Image src={`/brand/${mascot}.png`} alt="" width={90} height={100} className="mz-empty-box__img" />
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
            <div className="mz-row mz-gap-t-sm">
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

/* ==========================================================================
   Dialog — единый доступный модальный диалог (focus trap, Esc, блок прокрутки)
   ========================================================================== */

interface DialogProps {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Запретить закрытие (во время сохранения). */
  busy?: boolean;
  size?: 'sm' | 'md';
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<DialogProps> = ({ title, icon, onClose, children, busy = false, size = 'sm' }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Фокус внутрь диалога, если автофокус не задан полю
    if (panel && !panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>('[autofocus]') ?? panel.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === 'Tab' && panel) {
        const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="mz-dialog" role="presentation">
      <div className="mz-dialog__backdrop" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`mz-dialog__panel mz-dialog__panel--${size} mz-fade-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mz-dialog__head">
          <h2 id={titleId}>
            {icon}
            {title}
          </h2>
          <button type="button" className="mz-icon-btn" onClick={onClose} disabled={busy} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        <div className="mz-dialog__body">{children}</div>
      </div>
    </div>
  );
};

/** Скелетон рабочей области ученика: повторяет сетку спринта, дней и hero — без «прыжка» макета. */
export const PageSkeleton: React.FC<{ label?: string }> = ({ label = 'Загрузка…' }) => (
  <div className="mz-page-skeleton" role="status" aria-live="polite" aria-label={label}>
    <div className="mz-page-skeleton__row">
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} height={58} />
      ))}
    </div>
    <div className="mz-page-skeleton__row mz-page-skeleton__row--days">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} height={64} />
      ))}
    </div>
    <Skeleton height={72} />
    <Skeleton height={260} />
    <Skeleton height={84} />
    <Skeleton height={84} />
    <span className="mz-visually-hidden">{label}</span>
  </div>
);
