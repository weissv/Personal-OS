'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users, BarChart3, UserPlus, Calendar, Layers, History, RefreshCw, Plus, Check, AlertTriangle } from 'lucide-react';
import './admin/admin-godmode.css';
import { AdminStats, AdminUser, TimetableSlot, AuditLogEntry, TabType } from './admin/types';
import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminRegisterTab } from './admin/AdminRegisterTab';
import { AdminTimetableTab } from './admin/AdminTimetableTab';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminSystemTab } from './admin/AdminSystemTab';
import { PasswordResetModal } from './admin/PasswordResetModal';
import { AddSlotModal } from './admin/AddSlotModal';
import { ConfirmDialog } from './admin/ConfirmDialog';
import { EditUserDialog } from './admin/EditUserDialog';
import { apiFetch } from '@/lib/api-client';

interface AdminGodmodeViewProps {
  onSwitchToUser: (userId: string) => void;
  adminName: string;
}

type Flash = { tone: 'ok' | 'error'; text: string } | null;

interface SyncResult {
  timetableSlotsCount: number;
  totalSlotsPopulated: number;
  createdCurators: Array<{ fullName: string; username: string; temporaryPassword: string }>;
}

const TABS: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: 'analytics', label: 'Аналитика и риски', icon: <BarChart3 size={16} /> },
  { id: 'users', label: 'Реестр', icon: <Users size={16} /> },
  { id: 'register', label: 'Регистрация', icon: <Plus size={16} /> },
  { id: 'timetable', label: 'Расписание', icon: <Calendar size={16} /> },
  { id: 'audit', label: 'Журнал аудита', icon: <History size={16} /> },
  { id: 'system', label: 'Инфраструктура', icon: <Layers size={16} /> },
];

export const AdminGodmodeView: React.FC<AdminGodmodeViewProps> = ({ onSwitchToUser, adminName }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [timetableGrade, setTimetableGrade] = useState<number>(9);
  const [flash, setFlash] = useState<Flash>(null);

  const [passwordModalUser, setPasswordModalUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [isSyncingTimetable, setIsSyncingTimetable] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [confirm, setConfirm] = useState<null | { title: string; body: React.ReactNode; actionLabel: string; onConfirm: () => Promise<void> }>(null);

  const notify = useCallback((tone: 'ok' | 'error', text: string) => setFlash({ tone, text }), []);

  // Сообщение исчезает само через 5 секунд
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  const loadStats = useCallback(async () => {
    const res = await apiFetch<{ stats: AdminStats }>('/api/v1/admin/stats');
    if (res.ok && res.data) setStats(res.data.stats);
    else notify('error', `Аналитика: ${res.error}`);
  }, [notify]);

  const loadUsers = useCallback(async () => {
    const res = await apiFetch<{ users: AdminUser[] }>('/api/v1/admin/users');
    if (res.ok && res.data) setUsers(res.data.users);
    else notify('error', `Реестр: ${res.error}`);
  }, [notify]);

  const loadTimetable = useCallback(
    async (grade: number) => {
      const res = await apiFetch<{ slots: TimetableSlot[] }>(`/api/v1/admin/timetable?grade=${grade}`);
      if (res.ok && res.data) setTimetableSlots(res.data.slots);
      else notify('error', `Расписание: ${res.error}`);
    },
    [notify]
  );

  const loadAudit = useCallback(async () => {
    const res = await apiFetch<{ logs: AuditLogEntry[] }>('/api/v1/admin/audit?limit=100');
    if (res.ok && res.data) setAuditLogs(res.data.logs);
    else notify('error', `Журнал: ${res.error}`);
  }, [notify]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadStats(), loadUsers(), loadAudit()]);
    setIsRefreshing(false);
  }, [loadStats, loadUsers, loadAudit]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await refreshAll();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAll]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      if (activeTab === 'timetable') await loadTimetable(timetableGrade);
      else if (activeTab === 'audit') await loadAudit();
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, timetableGrade, loadTimetable, loadAudit]);

  const handleDeleteUser = (user: AdminUser) => {
    setConfirm({
      title: 'Удалить пользователя?',
      body: (
        <>
          <strong>{user.fullName}</strong> (@{user.username}) будет удалён безвозвратно
          {user.role === 'STUDENT' ? ' вместе со спринтами, ретроспективами и медиа' : ''}. Если нужно лишь закрыть доступ —
          отключите аккаунт.
        </>
      ),
      actionLabel: 'Удалить навсегда',
      onConfirm: async () => {
        const res = await apiFetch(`/api/v1/admin/users/${user.id}`, { method: 'DELETE' });
        if (res.ok) {
          notify('ok', `${user.fullName} удалён`);
          await Promise.all([loadUsers(), loadStats()]);
        } else notify('error', res.error || 'Не удалось удалить');
      },
    });
  };

  const handleToggleActive = async (user: AdminUser) => {
    const res = await apiFetch(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', body: { isActive: !user.isActive } });
    if (res.ok) {
      notify('ok', user.isActive ? `${user.fullName}: доступ отключён, сессии завершены` : `${user.fullName}: доступ восстановлен`);
      await Promise.all([loadUsers(), loadStats()]);
    } else notify('error', res.error || 'Не удалось изменить статус');
  };

  const handleDeleteTimetableSlot = (slot: TimetableSlot) => {
    setConfirm({
      title: 'Удалить урок из шаблона?',
      body: (
        <>
          «{slot.title}» ({slot.startTime}–{slot.endTime}) исчезнет из шаблона {slot.gradeLevel} класса. Уже созданные спринты
          учеников не изменятся.
        </>
      ),
      actionLabel: 'Удалить урок',
      onConfirm: async () => {
        const res = await apiFetch(`/api/v1/admin/timetable?id=${slot.id}`, { method: 'DELETE' });
        if (res.ok) await loadTimetable(timetableGrade);
        else notify('error', res.error || 'Не удалось удалить урок');
      },
    });
  };

  const handleSyncTimetable = () => {
    setConfirm({
      title: 'Синхронизировать с расписанием MIS?',
      body: (
        <>
          Шаблоны 8 и 9 классов будут пересобраны из файла MIS — ручные правки в этих шаблонах заменятся. Пустые будни в
          активных спринтах получат уроки. Уже активированные задачи учеников не затрагиваются.
        </>
      ),
      actionLabel: 'Синхронизировать',
      onConfirm: async () => {
        setIsSyncingTimetable(true);
        const res = await apiFetch<SyncResult>('/api/v1/admin/sync', { method: 'POST' });
        setIsSyncingTimetable(false);
        if (res.ok && res.data) {
          setSyncResult(res.data);
          notify('ok', `Шаблон: ${res.data.timetableSlotsCount} уроков · добавлено в дневники: ${res.data.totalSlotsPopulated}`);
          await Promise.all([loadTimetable(timetableGrade), loadStats(), loadUsers()]);
        } else notify('error', res.error || 'Синхронизация не удалась');
      },
    });
  };

  const studentsOnly = users.filter((u) => u.role === 'STUDENT');

  return (
    <div className="gm-root">
      <div className="gm-banner">
        <div>
          <div className="gm-badge-row">
            <span className="gm-badge-godmode">Godmode</span>
            <span className="gm-badge-user">{adminName} · Mezon Inspiring School</span>
          </div>
          <h1 className="gm-title">
            Пульт управления <span className="gm-title-hl">Sprint OS</span>
          </h1>
          <p className="gm-desc">Аудит, онбординг учеников, управление сеткой уроков и раннее обнаружение зон риска.</p>
        </div>

        <div className="gm-banner__actions">
          <button type="button" onClick={() => setActiveTab('register')} className="gm-btn-register">
            <UserPlus size={16} />
            <span>Новый участник</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              refreshAll();
              if (activeTab === 'timetable') loadTimetable(timetableGrade);
            }}
            className="gm-btn-refresh"
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Обновляю…' : 'Обновить'}</span>
          </button>
        </div>
      </div>

      {flash && (
        <div className={`gm-flash gm-flash--${flash.tone}`} role={flash.tone === 'error' ? 'alert' : 'status'}>
          {flash.tone === 'ok' ? <Check size={16} /> : <AlertTriangle size={16} />}
          <span>{flash.text}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Скрыть">
            ×
          </button>
        </div>
      )}

      <div className="gm-tabs-scroll">
        <div className="gm-tabs" role="tablist" aria-label="Разделы Godmode">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`gm-tab ${activeTab === t.id ? 'gm-tab--active' : ''}`}
            >
              {t.icon}
              <span>
                {t.label}
                {t.id === 'users' && users.length ? ` (${users.length})` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analytics' &&
        (stats ? (
          <AdminAnalyticsTab stats={stats} onSwitchToUser={onSwitchToUser} />
        ) : (
          <div className="gm-box gm-td-empty">{isRefreshing ? 'Загружаю аналитику…' : 'Аналитика недоступна'}</div>
        ))}

      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          onSwitchToUser={onSwitchToUser}
          onOpenPasswordModal={(u) => setPasswordModalUser(u)}
          onDeleteUser={handleDeleteUser}
          onToggleActive={handleToggleActive}
          onEditUser={setEditUser}
        />
      )}

      {activeTab === 'register' && (
        <AdminRegisterTab
          studentsList={studentsOnly}
          onUserRegistered={() => {
            loadUsers();
            loadStats();
            loadAudit();
          }}
        />
      )}

      {activeTab === 'timetable' && (
        <AdminTimetableTab
          timetableSlots={timetableSlots}
          timetableGrade={timetableGrade}
          onGradeChange={setTimetableGrade}
          onOpenAddSlotModal={() => setShowAddSlotModal(true)}
          onDeleteSlot={handleDeleteTimetableSlot}
          onSyncTimetable={handleSyncTimetable}
          isSyncingTimetable={isSyncingTimetable}
          syncResult={syncResult}
          onDismissSyncResult={() => setSyncResult(null)}
        />
      )}

      {activeTab === 'audit' && <AdminAuditTab auditLogs={auditLogs} />}

      {activeTab === 'system' && <AdminSystemTab />}

      {passwordModalUser && (
        <PasswordResetModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSuccess={() => {
            notify('ok', `Пароль ${passwordModalUser.fullName} обновлён, прежние сессии завершены`);
            loadAudit();
          }}
        />
      )}

      {showAddSlotModal && (
        <AddSlotModal
          gradeLevel={timetableGrade}
          onClose={() => setShowAddSlotModal(false)}
          onSuccess={() => loadTimetable(timetableGrade)}
        />
      )}

      {editUser && (
        <EditUserDialog
          user={editUser}
          students={studentsOnly}
          onClose={() => setEditUser(null)}
          onSaved={(name) => {
            notify('ok', `Профиль ${name} обновлён`);
            loadUsers();
            loadAudit();
          }}
        />
      )}

      {confirm && <ConfirmDialog {...confirm} onClose={() => setConfirm(null)} />}
    </div>
  );
};
