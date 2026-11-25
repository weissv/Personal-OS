'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  diagnostics?: {
    totalCheckDurationMs: number;
    database: { status: string; latencyMs: number | null };
    invariantI3_AuditImmutable: string;
    storage: { writable: boolean };
    process: { heapUsedMb: number; rssMb: number; node: string };
  };
}

type Level = 'ok' | 'warn' | 'fail';

const ICON: Record<Level, React.ReactNode> = {
  ok: <CheckCircle2 size={18} className="text-teal" />,
  warn: <AlertTriangle size={18} className="gm-text-warn" />,
  fail: <XCircle size={18} className="text-red" />,
};

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d} д ${h} ч` : h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

/**
 * Genchi Genbutsu: вкладка показывает фактический результат /api/health,
 * а не статичные «зелёные галочки».
 */
export const AdminSystemTab: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const probe = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const json = (await res.json()) as HealthResponse;
      setHealth(json);
      setError(null);
    } catch {
      setError('Не удалось получить ответ /api/health');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await probe();
    })();
    return () => {
      cancelled = true;
    };
  }, [probe]);

  const d = health?.diagnostics;
  const cards: Array<{ title: string; level: Level; text: string; badge: string }> = d
    ? [
        {
          title: 'База данных PostgreSQL',
          level: d.database.status === 'CONNECTED' ? ((d.database.latencyMs ?? 0) > 200 ? 'warn' : 'ok') : 'fail',
          text:
            d.database.status === 'CONNECTED'
              ? `Подключена, задержка запроса ${d.database.latencyMs} мс.`
              : 'Нет соединения с базой — данные недоступны.',
          badge: d.database.status,
        },
        {
          title: 'Неизменяемый журнал (I3)',
          level: d.invariantI3_AuditImmutable === 'ACTIVE_AND_ENFORCED' ? 'ok' : 'fail',
          text:
            d.invariantI3_AuditImmutable === 'ACTIVE_AND_ENFORCED'
              ? 'Триггеры запрещают UPDATE, DELETE и TRUNCATE в AuditLog.'
              : 'Триггеры не найдены: журнал можно изменить. Запустите node scripts/apply-invariants.js.',
          badge: d.invariantI3_AuditImmutable,
        },
        {
          title: 'Хранилище медиа',
          level: d.storage.writable ? 'ok' : 'fail',
          text: d.storage.writable
            ? 'Том uploads доступен на запись; файлы отдаются по правилам Selective Trust.'
            : 'Том uploads недоступен на запись — загрузка фото и голоса не работает.',
          badge: d.storage.writable ? 'WRITABLE' : 'READ_ONLY',
        },
        {
          title: 'Процесс Node.js',
          level: d.process.rssMb > 900 ? 'warn' : 'ok',
          text: `Работает ${uptime(health!.uptimeSeconds)}. Память: ${d.process.rssMb} МБ RSS, heap ${d.process.heapUsedMb} МБ.`,
          badge: d.process.node,
        },
      ]
    : [];

  return (
    <div className="gm-box">
      <div className="gm-tt-header">
        <div>
          <div className="gm-box-subtitle text-teal">Диагностика в реальном времени</div>
          <h2 className="gm-box-title">
            Состояние сервиса:{' '}
            {health ? (health.status === 'ok' ? 'всё в норме' : health.status === 'degraded' ? 'есть замечания' : 'сбой') : '…'}
          </h2>
          {health && (
            <p className="gm-box-desc">
              Проверено {new Date(health.timestamp).toLocaleTimeString('ru-RU')} за {d?.totalCheckDurationMs ?? '—'} мс.
            </p>
          )}
        </div>
        <button
          type="button"
          className="gm-btn-refresh"
          onClick={() => {
            setChecking(true);
            probe();
          }}
          disabled={checking}
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          <span>{checking ? 'Проверяю…' : 'Проверить снова'}</span>
        </button>
      </div>

      {error && <div className="gm-alert-danger">✕ {error}</div>}

      <div className="gm-system-grid">
        {cards.map((c) => (
          <div key={c.title} className={`gm-sys-card gm-sys-card--${c.level}`}>
            <div className="gm-sys-status">
              {ICON[c.level]}
              <span>{c.title}</span>
            </div>
            <p className="gm-sys-desc">{c.text}</p>
            <div className="gm-sys-badge">{c.badge}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
