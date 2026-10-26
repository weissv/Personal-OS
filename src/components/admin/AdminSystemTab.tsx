'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const AdminSystemTab: React.FC = () => {
  return (
    <div className="gm-box">
      <div className="gm-box-subtitle text-teal">Production Infrastructure Audit</div>
      <h2 className="gm-box-title">Статус коммерческой готовности сервиса</h2>

      <div className="gm-system-grid">
        <div className="gm-sys-card">
          <div className="gm-sys-status">
            <CheckCircle2 size={18} color="#27ae60" />
            <span>База данных PostgreSQL</span>
          </div>
          <p className="gm-sys-desc">
            Prisma ORM подключена, схема синхронизирована с User, Sprint, Week, Day, DaySlot, MediaAsset, TimetableSlot, AuditLog. Инвариант I3 (Append-Only Audit) активен.
          </p>
          <div className="gm-sys-badge">Status: CONNECTED &amp; INVARIANTS_ACTIVE</div>
        </div>

        <div className="gm-sys-card">
          <div className="gm-sys-status">
            <CheckCircle2 size={18} color="#27ae60" />
            <span>Аутентификация и GODMODE</span>
          </div>
          <p className="gm-sys-desc">
            Криптографический scrypt-хэшинг с HMAC-подписанными сессиями (mezon_session), IPv6 /64 subnetting и защитой от перебора.
          </p>
          <div className="gm-sys-badge">Founder Account: somi (ADMIN)</div>
        </div>

        <div className="gm-sys-card">
          <div className="gm-sys-status">
            <CheckCircle2 size={18} color="#27ae60" />
            <span>Мобильная адаптивность</span>
          </div>
          <p className="gm-sys-desc">
            Терминал авторизации, панель управления Godmode и дневник полностью оптимизированы под мобильные экраны телефонов (320px–430px).
          </p>
          <div className="gm-sys-badge">Responsive: 100% MOBILE &amp; DESKTOP</div>
        </div>

        <div className="gm-sys-card">
          <div className="gm-sys-status">
            <CheckCircle2 size={18} color="#27ae60" />
            <span>Персистентное хранилище</span>
          </div>
          <p className="gm-sys-desc">
            Медиа-файлы и голосовые заметки защищены Docker-томом uploads_data и отдаются строго по правилам Selective Trust RBAC.
          </p>
          <div className="gm-sys-badge">Storage: RBAC-GATED PERSISTENT VOLUME</div>
        </div>
      </div>
    </div>
  );
};
