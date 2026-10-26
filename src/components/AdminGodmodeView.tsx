'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  UserPlus,
  Calendar,
  Layers,
  History,
  RefreshCw,
  Plus,
} from 'lucide-react';
import './admin-godmode.css';
import { AdminStats, AdminUser, TimetableSlot, AuditLogEntry, TabType } from './admin/types';
import { AdminAnalyticsTab } from './admin/AdminAnalyticsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminRegisterTab } from './admin/AdminRegisterTab';
import { AdminTimetableTab } from './admin/AdminTimetableTab';
import { AdminAuditTab } from './admin/AdminAuditTab';
import { AdminSystemTab } from './admin/AdminSystemTab';
import { PasswordResetModal } from './admin/PasswordResetModal';
import { AddSlotModal } from './admin/AddSlotModal';

interface AdminGodmodeViewProps {
  onSwitchToUser: (userId: string) => void;
}

export const AdminGodmodeView: React.FC<AdminGodmodeViewProps> = ({ onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableGrade, setTimetableGrade] = useState<number>(9);

  // Modal states
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUser | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [isSyncingTimetable, setIsSyncingTimetable] = useState(false);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch (e) {
      console.error('Failed to load admin stats:', e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch (e) {
      console.error('Failed to load users list:', e);
    }
  };

  const loadTimetable = async (grade = timetableGrade) => {
    try {
      const res = await fetch(`/api/v1/admin/timetable?grade=${grade}`);
      if (res.ok) {
        const json = await res.json();
        setTimetableSlots(json.slots || []);
      }
    } catch (e) {
      console.error('Failed to load timetable:', e);
    }
  };

  const loadAudit = async () => {
    try {
      const res = await fetch('/api/v1/admin/audit?limit=60');
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.logs || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([loadStats(), loadUsers(), loadTimetable(), loadAudit()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (activeTab === 'timetable') {
      loadTimetable(timetableGrade);
    } else if (activeTab === 'audit') {
      loadAudit();
    }
  }, [activeTab, timetableGrade]);

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Вы действительно хотите удалить пользователя ${name}? Все связанные спринты будут удалены.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
        loadStats();
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
    }
  };

  const handleDeleteTimetableSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/timetable?id=${slotId}`, { method: 'DELETE' });
      if (res.ok) {
        loadTimetable(timetableGrade);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncTimetable = async () => {
    setIsSyncingTimetable(true);
    try {
      const res = await fetch('/api/v1/admin/sync', { method: 'POST' });
      if (res.ok) {
        await loadTimetable(timetableGrade);
        await loadStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingTimetable(false);
    }
  };

  const studentsOnly = users.filter((u) => u.role === 'STUDENT');

  return (
    <div className="gm-root">
      {/* Top Banner */}
      <div className="gm-banner">
        <div>
          <div className="gm-badge-row">
            <span className="gm-badge-godmode">Founder Godmode</span>
            <span className="gm-badge-user">Somi · Mezon Inspiring School</span>
          </div>
          <h1 className="gm-title">
            Пульт Управления <span className="gm-title-hl">Sprint OS</span>
          </h1>
          <p className="gm-desc">
            Централизованный аудит, онбординг учеников, управление сеткой уроков и детекция зон риска.
          </p>
        </div>

        <div className="gm-banner__actions">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className="gm-btn-register"
          >
            <UserPlus size={16} />
            <span>Новый участник</span>
          </button>
          <button
            type="button"
            onClick={refreshAll}
            className="gm-btn-refresh"
            title="Обновить аналитику"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="gm-tabs-scroll">
        <div className="gm-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`gm-tab ${activeTab === 'analytics' ? 'gm-tab--active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Аналитика и риски</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`gm-tab ${activeTab === 'users' ? 'gm-tab--active' : ''}`}
          >
            <Users size={16} />
            <span>Реестр ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`gm-tab ${activeTab === 'register' ? 'gm-tab--active' : ''}`}
          >
            <Plus size={16} />
            <span>Регистрация</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`gm-tab ${activeTab === 'timetable' ? 'gm-tab--active' : ''}`}
          >
            <Calendar size={16} />
            <span>Расписание</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`gm-tab ${activeTab === 'audit' ? 'gm-tab--active' : ''}`}
          >
            <History size={16} />
            <span>Журнал аудита</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`gm-tab ${activeTab === 'system' ? 'gm-tab--active' : ''}`}
          >
            <Layers size={16} />
            <span>Инфраструктура</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && stats && (
        <AdminAnalyticsTab stats={stats} onSwitchToUser={onSwitchToUser} />
      )}

      {activeTab === 'users' && (
        <AdminUsersTab
          users={users}
          onSwitchToUser={onSwitchToUser}
          onOpenPasswordModal={(u) => setPasswordModalUser(u)}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeTab === 'register' && (
        <AdminRegisterTab
          studentsList={studentsOnly}
          onUserRegistered={() => {
            loadUsers();
            loadStats();
          }}
        />
      )}

      {activeTab === 'timetable' && (
        <AdminTimetableTab
          timetableSlots={timetableSlots}
          timetableGrade={timetableGrade}
          onGradeChange={(g) => setTimetableGrade(g)}
          onOpenAddSlotModal={() => setShowAddSlotModal(true)}
          onDeleteSlot={handleDeleteTimetableSlot}
          onSyncTimetable={handleSyncTimetable}
          isSyncingTimetable={isSyncingTimetable}
        />
      )}

      {activeTab === 'audit' && <AdminAuditTab auditLogs={auditLogs} />}

      {activeTab === 'system' && <AdminSystemTab />}

      {/* Modals */}
      {passwordModalUser && (
        <PasswordResetModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSuccess={() => {
            loadUsers();
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
    </div>
  );
};
