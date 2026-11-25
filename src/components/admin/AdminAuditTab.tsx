'use client';

import React, { useMemo, useState } from 'react';
import { AuditLogEntry } from './types';
import { formatSchoolDateTime } from '@/lib/school-time';

interface AdminAuditTabProps {
  auditLogs: AuditLogEntry[];
}

const ACTION_LABEL: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'info' }> = {
  LOGIN: { label: 'Вход', tone: 'ok' },
  LOGIN_FAILED: { label: 'Неудачный вход', tone: 'warn' },
  PASSWORD_CHANGED: { label: 'Смена пароля', tone: 'info' },
  USER_CREATED: { label: 'Пользователь создан', tone: 'ok' },
  USER_UPDATED: { label: 'Профиль изменён', tone: 'info' },
  USER_DEACTIVATED: { label: 'Доступ отключён', tone: 'warn' },
  USER_PASSWORD_RESET: { label: 'Сброс пароля', tone: 'warn' },
  USER_DELETED: { label: 'Пользователь удалён', tone: 'danger' },
  IMPERSONATE_START: { label: 'Вход от лица', tone: 'warn' },
  IMPERSONATE_END: { label: 'Выход из имперсонации', tone: 'info' },
  MENTOR_REVIEW_SIGNED: { label: 'Ревью куратора', tone: 'ok' },
  PARENT_REVIEW_SIGNED: { label: 'Отзыв родителя', tone: 'ok' },
  PARENT_ACCESS_CHANGED: { label: 'Доступ семьи изменён', tone: 'info' },
  MEDIA_ASSET_DELETED: { label: 'Артефакт удалён', tone: 'warn' },
  TIMETABLE_SLOT_CREATED: { label: 'Урок добавлен', tone: 'info' },
  TIMETABLE_SLOT_DELETED: { label: 'Урок удалён', tone: 'warn' },
  TIMETABLE_SYNCED: { label: 'Синхронизация MIS', tone: 'info' },
};

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'security', label: 'Безопасность' },
  { id: 'users', label: 'Пользователи' },
  { id: 'learning', label: 'Учёба' },
] as const;
type FilterId = (typeof FILTERS)[number]['id'];

function matches(action: string, filter: FilterId) {
  if (filter === 'all') return true;
  if (filter === 'security') return /LOGIN|PASSWORD|IMPERSONATE|DEACTIVATED/.test(action);
  if (filter === 'users') return action.startsWith('USER_') || action === 'PARENT_ACCESS_CHANGED';
  return /REVIEW|MEDIA|TIMETABLE/.test(action);
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({ auditLogs }) => {
  const [filter, setFilter] = useState<FilterId>('all');
  const visible = useMemo(() => auditLogs.filter((l) => matches(l.action, filter)), [auditLogs, filter]);
  const failedLogins = auditLogs.filter((l) => l.action === 'LOGIN_FAILED').length;

  return (
    <div className="gm-box">
      <div className="gm-box-subtitle text-indigo">Безопасность и журнал операций</div>
      <h2 className="gm-box-title">Журнал действий</h2>
      <p className="gm-box-desc">
        Входы, изменения пользователей, сбросы паролей, имперсонация и подписание ревью. Таблица защищена триггером PostgreSQL
        (Invariant I3): записи нельзя изменить или удалить. Показаны последние {auditLogs.length}.
        {failedLogins > 0 && <> Неудачных входов: <strong>{failedLogins}</strong>.</>}
      </p>

      <div className="gm-role-pills gm-gap-b" role="group" aria-label="Фильтр журнала">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`gm-role-pill ${filter === f.id ? 'gm-role-pill--active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="gm-audit-list">
        {visible.length === 0 ? (
          <div className="gm-td-empty">Записей нет</div>
        ) : (
          visible.map((log) => {
            const meta = ACTION_LABEL[log.action] ?? { label: log.action, tone: 'info' as const };
            return (
              <div key={log.id} className="gm-audit-entry">
                <div className="gm-audit-meta">
                  <span className={`gm-audit-action gm-audit-action--${meta.tone}`} title={log.action}>
                    {meta.label}
                  </span>
                  <time className="gm-audit-time" dateTime={log.createdAt}>
                    {formatSchoolDateTime(log.createdAt, {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </time>
                </div>
                <div className="gm-audit-body">
                  <strong>{log.actorName}</strong>
                  {log.targetName && log.targetName !== log.actorName ? <> → {log.targetName}</> : null}
                  {log.details ? <>: {log.details}</> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
