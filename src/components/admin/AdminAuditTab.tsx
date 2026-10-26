'use client';

import React from 'react';
import { AuditLogEntry } from './types';

interface AdminAuditTabProps {
  auditLogs: AuditLogEntry[];
}

export const AdminAuditTab: React.FC<AdminAuditTabProps> = ({ auditLogs }) => {
  return (
    <div className="gm-box">
      <div className="gm-box-subtitle text-indigo">Безопасность и журнал операций</div>
      <h2 className="gm-box-title">Аудит действий администраторов и пользователей</h2>
      <p className="gm-box-desc">
        Полный журнал ключевых событий: авторизации, создание пользователей, сброс паролей и подписание ревью.
        Защищен аппаратно-логическим триггером инварианта I3 (Append-only).
      </p>

      <div className="gm-audit-list">
        {auditLogs.length === 0 ? (
          <div className="gm-td-empty">Журнал пока пуст</div>
        ) : (
          auditLogs.map((log) => (
            <div key={log.id} className="gm-audit-entry">
              <div className="gm-audit-meta">
                <span className="gm-audit-action">{log.action}</span>
                <span className="gm-audit-time">
                  {new Date(log.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div className="gm-audit-body">
                <strong>{log.actorName}</strong>: {log.details || log.action}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
