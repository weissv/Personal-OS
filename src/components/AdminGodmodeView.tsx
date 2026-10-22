'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Search,
  Filter,
  Eye,
  Trash2,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  GraduationCap,
  HeartHandshake,
  UserCheck,
  History,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';

interface AdminStats {
  users: {
    students: number;
    mentors: number;
    parents: number;
    admins: number;
    total: number;
  };
  cohorts: {
    grade8?: number;
    grade9: number;
    grade10: number;
    grade11: number;
  };
  slots: {
    total: number;
    done: number;
    migrated: number;
    dropped: number;
    pending: number;
    completionRate: number;
    migrationRate: number;
  };
  sprints: {
    total: number;
    weeksTotal: number;
    submittedRetrosTotal: number;
  };
  atRiskStudents: Array<{
    id: string;
    fullName: string;
    gradeLevel: number;
    email: string;
    username: string;
    migrationRate: number;
    flags: string[];
  }>;
}

interface AdminUser {
  id: string;
  fullName: string;
  username: string | null;
  email: string;
  role: 'STUDENT' | 'MENTOR' | 'PARENT' | 'ADMIN';
  gradeLevel: number | null;
  isActive: boolean;
  sprintsCount: number;
  parents: Array<{ id: string; fullName: string; accessLevel: string }>;
  students: Array<{ id: string; fullName: string; accessLevel: string }>;
  createdAt: string;
}

interface TimetableSlot {
  id: string;
  gradeLevel: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  orderIndex: number;
}

interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  createdAt: string;
}

interface AdminGodmodeViewProps {
  onSwitchToUser: (userId: string) => void;
}

type TabType = 'analytics' | 'users' | 'register' | 'timetable' | 'audit' | 'system';

const DAY_NAMES: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};

export const AdminGodmodeView: React.FC<AdminGodmodeViewProps> = ({ onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [timetableGrade, setTimetableGrade] = useState<number>(9);

  // Password reset modal state
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetStatus, setPasswordResetStatus] = useState<string | null>(null);

  // New timetable slot form
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlotForm, setNewSlotForm] = useState({
    gradeLevel: 9,
    dayOfWeek: 1,
    startTime: '08:30',
    endTime: '09:15',
    title: '',
  });

  // Register Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'STUDENT',
    gradeLevel: 9,
    studentId: '',
    accessLevel: 'SUMMARY_ONLY',
  });
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Data
  const loadStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.stats);
      }
    } catch (e) {
      console.error('Stats error:', e);
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
      console.error('Users error:', e);
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
      console.error('Timetable error:', e);
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
      console.error('Audit error:', e);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        setRegisterError(json.error || 'Ошибка при регистрации');
        setIsSubmitting(false);
        return;
      }

      setRegisterSuccess(
        `Пользователь ${formData.fullName} успешно зарегистрирован!` +
          (formData.role === 'STUDENT' ? ' 10-недельный спринт и сетка уроков сгенерированы.' : '')
      );
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'STUDENT',
        gradeLevel: 9,
        studentId: '',
        accessLevel: 'SUMMARY_ONLY',
      });
      refreshAll();
    } catch {
      setRegisterError('Не удалось отправить запрос на сервер');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Вы действительно хотите удалить пользователя ${name}? Все связанные данные будут стерты.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        refreshAll();
      } else {
        const json = await res.json();
        alert(json.error || 'Не удалось удалить');
      }
    } catch {
      alert('Ошибка при удалении');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${passwordModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setPasswordResetStatus('Пароль успешно обновлен!');
        setTimeout(() => {
          setPasswordModalUser(null);
          setNewPassword('');
          setPasswordResetStatus(null);
        }, 1200);
      } else {
        const json = await res.json();
        setPasswordResetStatus(`Ошибка: ${json.error || 'Не удалось сбросить пароль'}`);
      }
    } catch {
      setPasswordResetStatus('Ошибка при отправке запроса');
    }
  };

  const handleAddTimetableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlotForm),
      });
      if (res.ok) {
        setShowAddSlotModal(false);
        setNewSlotForm({
          gradeLevel: timetableGrade,
          dayOfWeek: 1,
          startTime: '08:30',
          endTime: '09:15',
          title: '',
        });
        loadTimetable(timetableGrade);
      } else {
        const json = await res.json();
        alert(json.error || 'Не удалось добавить урок');
      }
    } catch {
      alert('Ошибка при добавлении урока');
    }
  };

  const handleDeleteTimetableSlot = async (id: string) => {
    if (!confirm('Удалить урок из шаблона расписания?')) return;
    try {
      const res = await fetch(`/api/v1/admin/timetable?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadTimetable(timetableGrade);
      }
    } catch {
      alert('Ошибка при удалении урока');
    }
  };

  const [isSyncingTimetable, setIsSyncingTimetable] = useState(false);

  const handleSyncTimetable = async () => {
    if (!confirm('Синхронизировать эталонное расписание 8 и 9 классов из MIS и обновить дневники учеников?')) return;
    setIsSyncingTimetable(true);
    try {
      const res = await fetch('/api/v1/admin/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(`Синхронизация успешна!\nКураторов: ${json.curatorsCount}\nУроков в шаблоне: ${json.timetableSlotsCount}\nДобавлено уроков в дневники: ${json.totalSlotsPopulated}`);
        refreshAll();
      } else {
        alert(json.error || 'Ошибка синхронизации');
      }
    } catch {
      alert('Ошибка при отправке запроса');
    } finally {
      setIsSyncingTimetable(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const studentsList = users.filter((u) => u.role === 'STUDENT');

  return (
    <div className="gm-root">
      {/* GODMODE Header Banner */}
      <div className="gm-banner">
        <div className="gm-banner__info">
          <div className="gm-badge-row">
            <span className="gm-badge-godmode">⚡ GODMODE CONTROL</span>
            <span className="gm-badge-user">Founder Console · somi</span>
          </div>
          <h1 className="gm-title">
            Центр управления <span className="gm-title-hl">Mezon Sprint OS</span>
          </h1>
          <p className="gm-desc">
            Коммерческий запуск платформы · Управление школой, когортами, учениками и наставниками
          </p>
        </div>

        <div className="gm-banner__actions">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className="gm-btn-register"
          >
            <UserPlus size={16} />
            <span>+ Зарегистрировать</span>
          </button>
          <button
            type="button"
            onClick={refreshAll}
            className="gm-btn-refresh"
            title="Обновить все данные"
          >
            <RefreshCw size={14} />
            <span>Обновить</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="gm-tabs-scroll">
        <div className="gm-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`gm-tab ${activeTab === 'analytics' ? 'gm-tab--active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Аналитика и когорты</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`gm-tab ${activeTab === 'users' ? 'gm-tab--active' : ''}`}
          >
            <Users size={16} />
            <span>Пользователи ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`gm-tab ${activeTab === 'register' ? 'gm-tab--active' : ''}`}
          >
            <UserPlus size={16} />
            <span>Онбординг</span>
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
            <span>Аудит действий</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`gm-tab ${activeTab === 'system' ? 'gm-tab--active' : ''}`}
          >
            <Database size={16} />
            <span>Готовность сервера</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYTICS & COHORTS */}
      {activeTab === 'analytics' && stats && (
        <div className="gm-section">
          {/* Key Metric Tiles */}
          <div className="gm-metrics-grid">
            <div className="gm-card-metric">
              <div className="gm-card-metric__label">Всего учеников</div>
              <div className="gm-card-metric__value">{stats.users.students}</div>
              <div className="gm-card-metric__sub text-teal">Активных спринтов: {stats.sprints.total}</div>
            </div>

            <div className="gm-card-metric">
              <div className="gm-card-metric__label">Кураторы / Наставники</div>
              <div className="gm-card-metric__value">{stats.users.mentors}</div>
              <div className="gm-card-metric__sub text-magenta">Закреплены за классами</div>
            </div>

            <div className="gm-card-metric">
              <div className="gm-card-metric__label">Родительский контроль</div>
              <div className="gm-card-metric__value">{stats.users.parents}</div>
              <div className="gm-card-metric__sub text-indigo">Selective Trust портал</div>
            </div>

            <div className="gm-card-metric">
              <div className="gm-card-metric__label">Выполнение слотов</div>
              <div className="gm-card-metric__value text-teal">{stats.slots.completionRate}%</div>
              <div className="gm-card-metric__sub">
                {stats.slots.done} из {stats.slots.total} слотов
              </div>
            </div>

            <div className="gm-card-metric">
              <div className="gm-card-metric__label">Переносы задач</div>
              <div
                className={`gm-card-metric__value ${
                  stats.slots.migrationRate > 30 ? 'text-red' : ''
                }`}
              >
                {stats.slots.migrationRate}%
              </div>
              <div className="gm-card-metric__sub">{stats.slots.migrated} слотов перенесено</div>
            </div>
          </div>

          {/* Cohorts & Risk Flags Grid */}
          <div className="gm-split-grid">
            {/* Cohorts breakdown */}
            <div className="gm-box">
              <div className="gm-box-subtitle text-magenta">Когорты школы (Классы)</div>
              <h2 className="gm-box-title">Распределение учеников по параллелям</h2>

              <div className="gm-cohorts-bars">
                <div>
                  <div className="gm-bar-header">
                    <span>8 класс</span>
                    <span>{stats.cohorts.grade8 || 0} учеников</span>
                  </div>
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill bg-teal"
                      style={{
                        width: `${
                          stats.users.students > 0
                            ? ((stats.cohorts.grade8 || 0) / stats.users.students) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="gm-bar-header">
                    <span>9 класс</span>
                    <span>{stats.cohorts.grade9} учеников</span>
                  </div>
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill bg-teal"
                      style={{
                        width: `${
                          stats.users.students > 0
                            ? (stats.cohorts.grade9 / stats.users.students) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="gm-bar-header">
                    <span>10 класс</span>
                    <span>{stats.cohorts.grade10} учеников</span>
                  </div>
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill bg-magenta"
                      style={{
                        width: `${
                          stats.users.students > 0
                            ? (stats.cohorts.grade10 / stats.users.students) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="gm-bar-header">
                    <span>11 класс (Выпускной)</span>
                    <span>{stats.cohorts.grade11} учеников</span>
                  </div>
                  <div className="gm-bar-track">
                    <div
                      className="gm-bar-fill bg-indigo"
                      style={{
                        width: `${
                          stats.users.students > 0
                            ? (stats.cohorts.grade11 / stats.users.students) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="gm-hint-note">
                * Новые ученики автоматически получают 10-недельный спринт четверти с расписанием соответствующего класса.
              </div>
            </div>

            {/* Red Flag Students (At-Risk) */}
            <div className="gm-box gm-box--danger">
              <div className="gm-danger-title">
                <ShieldAlert size={16} />
                <span>Зона внимания кураторов · Красные флаги</span>
              </div>
              <h2 className="gm-box-title">
                Ученики, требующие вмешательства ({stats.atRiskStudents.length})
              </h2>

              {stats.atRiskStudents.length === 0 ? (
                <div className="gm-empty-check">✓ Все ученики стабильно соблюдают субъектный ритм!</div>
              ) : (
                <div className="gm-risk-list">
                  {stats.atRiskStudents.map((st) => (
                    <div key={st.id} className="gm-risk-item">
                      <div>
                        <div className="gm-risk-name">
                          {st.fullName}{' '}
                          <span className="gm-risk-grade">({st.gradeLevel} класс)</span>
                        </div>
                        <div className="gm-flags-row">
                          {st.flags.map((fl, idx) => (
                            <span key={idx} className="gm-flag-tag">
                              {fl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSwitchToUser(st.id)}
                        className="gm-btn-inspect"
                      >
                        <Eye size={12} />
                        <span>Инспектировать</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS REGISTRY & IMPERSONATION */}
      {activeTab === 'users' && (
        <div className="gm-box">
          {/* Filters Bar */}
          <div className="gm-filter-bar">
            <div className="gm-search-input-wrap">
              <Search size={18} color="#5f5f5f" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, логину или email…"
                className="gm-search-input"
              />
            </div>

            <div className="gm-role-pills">
              {['ALL', 'STUDENT', 'MENTOR', 'PARENT', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`gm-role-pill ${roleFilter === r ? 'gm-role-pill--active' : ''}`}
                >
                  {r === 'ALL'
                    ? 'Все'
                    : r === 'STUDENT'
                    ? 'Ученики'
                    : r === 'MENTOR'
                    ? 'Кураторы'
                    : r === 'PARENT'
                    ? 'Родители'
                    : 'Админы'}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="gm-table-container">
            <table className="gm-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Логин / Email</th>
                  <th>Роль</th>
                  <th>Класс</th>
                  <th>Спринт / Связи</th>
                  <th style={{ textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="gm-td-empty">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="gm-tr">
                      <td className="gm-td-user">
                        <div className="gm-user-name">
                          {u.username === 'somi' && <span className="text-magenta">⚡</span>}
                          <span>{u.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="gm-username">@{u.username || '—'}</div>
                        <div className="gm-email">{u.email}</div>
                      </td>
                      <td>
                        <span className={`gm-role-tag gm-role-tag--${u.role.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="gm-td-grade">
                        {u.gradeLevel ? `${u.gradeLevel} класс` : '—'}
                      </td>
                      <td>
                        {u.role === 'STUDENT' && (
                          <span className="text-teal font-semibold">
                            {u.sprintsCount > 0 ? `${u.sprintsCount} спринт(а)` : 'Нет спринта'}
                          </span>
                        )}
                        {u.role === 'PARENT' && (
                          <span className="gm-muted">
                            {u.students.length > 0 ? `Ученик: ${u.students[0].fullName}` : 'Не привязан'}
                          </span>
                        )}
                        {u.role === 'MENTOR' && (
                          <span className="gm-muted">
                            Куратор {u.gradeLevel ? `${u.gradeLevel} класса` : 'школы'}
                          </span>
                        )}
                        {u.role === 'ADMIN' && (
                          <span className="text-magenta font-bold">Полный доступ</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="gm-actions-row">
                          {u.username !== 'somi' && (
                            <button
                              type="button"
                              onClick={() => onSwitchToUser(u.id)}
                              title={`Войти от лица ${u.fullName}`}
                              className="gm-btn-act gm-btn-act--enter"
                            >
                              <Eye size={12} />
                              <span>Войти</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordModalUser(u);
                              setNewPassword('');
                              setPasswordResetStatus(null);
                            }}
                            title="Сменить пароль"
                            className="gm-btn-act gm-btn-act--pwd"
                          >
                            <KeyRound size={12} />
                          </button>
                          {u.username !== 'somi' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              title="Удалить пользователя"
                              className="gm-btn-act gm-btn-act--del"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="gm-cards-mobile">
            {filteredUsers.length === 0 ? (
              <div className="gm-td-empty">Пользователи не найдены</div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="gm-user-card">
                  <div className="gm-user-card__head">
                    <div>
                      <div className="gm-user-card__name">
                        {u.username === 'somi' && <span className="text-magenta">⚡</span>}
                        {u.fullName}
                      </div>
                      <div className="gm-user-card__login">@{u.username || '—'} · {u.email}</div>
                    </div>
                    <span className={`gm-role-tag gm-role-tag--${u.role.toLowerCase()}`}>
                      {u.role}
                    </span>
                  </div>

                  <div className="gm-user-card__meta">
                    {u.gradeLevel && <span>Класс: {u.gradeLevel}</span>}
                    {u.role === 'STUDENT' && (
                      <span className="text-teal font-semibold">
                        {u.sprintsCount > 0 ? `${u.sprintsCount} спринт` : 'Без спринта'}
                      </span>
                    )}
                    {u.role === 'PARENT' && u.students.length > 0 && (
                      <span>Ученик: {u.students[0].fullName}</span>
                    )}
                  </div>

                  <div className="gm-user-card__footer">
                    {u.username !== 'somi' && (
                      <button
                        type="button"
                        onClick={() => onSwitchToUser(u.id)}
                        className="gm-btn-act gm-btn-act--enter"
                      >
                        <Eye size={12} />
                        <span>Войти</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordModalUser(u);
                        setNewPassword('');
                        setPasswordResetStatus(null);
                      }}
                      className="gm-btn-act gm-btn-act--pwd"
                    >
                      <KeyRound size={12} />
                      <span>Пароль</span>
                    </button>
                    {u.username !== 'somi' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                        className="gm-btn-act gm-btn-act--del"
                      >
                        <Trash2 size={12} />
                        <span>Удалить</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REGISTER NEW USER */}
      {activeTab === 'register' && (
        <div className="gm-box gm-box--narrow">
          <div className="gm-box-subtitle text-magenta">Онбординг участников школы</div>
          <h2 className="gm-box-title">Регистрация нового пользователя</h2>
          <p className="gm-box-desc">
            При создании ученика автоматически формируется 10-недельный спринт четверти с расписанием предметов выбранного класса и проектной субботой.
          </p>

          {registerSuccess && (
            <div className="gm-alert-success">
              <CheckCircle2 size={18} />
              <span>{registerSuccess}</span>
            </div>
          )}

          {registerError && (
            <div className="gm-alert-danger">
              ✕ {registerError}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit}>
            {/* Role picker buttons */}
            <div className="gm-form-group">
              <label className="gm-form-label">Роль в системе *</label>
              <div className="gm-role-grid">
                {[
                  { r: 'STUDENT', label: 'Ученик', icon: <GraduationCap size={16} /> },
                  { r: 'MENTOR', label: 'Куратор', icon: <UserCheck size={16} /> },
                  { r: 'PARENT', label: 'Родитель', icon: <HeartHandshake size={16} /> },
                  { r: 'ADMIN', label: 'Админ', icon: <Sparkles size={16} /> },
                ].map(({ r, label, icon }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r })}
                    className={`gm-role-choice ${
                      formData.role === r ? 'gm-role-choice--active' : ''
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs grid */}
            <div className="gm-form-row">
              <div className="gm-form-group">
                <label className="gm-form-label">ФИО пользователя *</label>
                <input
                  type="text"
                  required
                  placeholder="Азиз Каримов"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="gm-input"
                />
              </div>

              <div className="gm-form-group">
                <label className="gm-form-label">Логин (Username) *</label>
                <input
                  type="text"
                  required
                  placeholder="aziz"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="gm-input"
                />
              </div>
            </div>

            <div className="gm-form-row">
              <div className="gm-form-group">
                <label className="gm-form-label">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="aziz@mezon.uz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="gm-input"
                />
              </div>

              <div className="gm-form-group">
                <label className="gm-form-label">Пароль *</label>
                <input
                  type="text"
                  required
                  placeholder="Не менее 8 символов"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="gm-input"
                />
              </div>
            </div>

            {(formData.role === 'STUDENT' || formData.role === 'MENTOR') && (
              <div className="gm-form-group">
                <label className="gm-form-label">Класс (Параллель)</label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: parseInt(e.target.value, 10) })}
                  className="gm-select"
                >
                  <option value={8}>8 класс</option>
                  <option value={9}>9 класс</option>
                  <option value={10}>10 класс</option>
                  <option value={11}>11 класс (Выпускной)</option>
                </select>
              </div>
            )}

            {formData.role === 'PARENT' && (
              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label className="gm-form-label">Привязать к ученику:</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="gm-select"
                  >
                    <option value="">-- Выберите ученика --</option>
                    {studentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.gradeLevel || 9} класс)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gm-form-group">
                  <label className="gm-form-label">Уровень доступа:</label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                    className="gm-select"
                  >
                    <option value="SUMMARY_ONLY">SUMMARY_ONLY (Только ретроспектива и проект)</option>
                    <option value="FULL_ACCESS">FULL_ACCESS (Полный просмотр сетки слотов)</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="gm-btn-submit"
            >
              {isSubmitting ? (
                <span>Создание пользователя и генерация спринта…</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Создать пользователя</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: TIMETABLE SCHEDULE TEMPLATE */}
      {activeTab === 'timetable' && (
        <div className="gm-box">
          <div className="gm-tt-header">
            <div>
              <div className="gm-box-subtitle text-teal">Сетка учебного плана школы</div>
              <h2 className="gm-box-title">Шаблон расписания по параллелям</h2>
              <p className="gm-box-desc">
                Эти уроки служат источником для генерации спринтов новых учеников.
              </p>
            </div>

            <div className="gm-tt-controls">
              <div className="gm-grade-pills">
                {[8, 9, 10, 11].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setTimetableGrade(g)}
                    className={`gm-grade-pill ${timetableGrade === g ? 'gm-grade-pill--active' : ''}`}
                  >
                    {g} класс
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewSlotForm({
                    gradeLevel: timetableGrade,
                    dayOfWeek: 1,
                    startTime: '08:30',
                    endTime: '09:15',
                    title: '',
                  });
                  setShowAddSlotModal(true);
                }}
                className="gm-btn-add-slot"
              >
                <Plus size={14} />
                <span>Добавить урок</span>
              </button>

              <button
                type="button"
                onClick={handleSyncTimetable}
                disabled={isSyncingTimetable}
                className="gm-btn-refresh"
                style={{ marginLeft: 8 }}
                title="Синхронизировать сетку 8 и 9 классов из файла MIS"
              >
                <RefreshCw size={14} className={isSyncingTimetable ? 'animate-spin' : ''} />
                <span>{isSyncingTimetable ? 'Синхронизация…' : 'Синхронизировать из MIS'}</span>
              </button>
            </div>
          </div>

          {/* Timetable days breakdown */}
          <div className="gm-tt-days">
            {[1, 2, 3, 4, 5].map((d) => {
              const daySlots = timetableSlots
                .filter((s) => s.dayOfWeek === d)
                .sort((a, b) => a.orderIndex - b.orderIndex || a.startTime.localeCompare(b.startTime));

              return (
                <div key={d} className="gm-tt-day">
                  <div className="gm-tt-day-title">{DAY_NAMES[d]}</div>
                  {daySlots.length === 0 ? (
                    <div className="gm-tt-empty">Нет уроков</div>
                  ) : (
                    <div className="gm-tt-slot-list">
                      {daySlots.map((s) => (
                        <div key={s.id} className="gm-tt-slot">
                          <div>
                            <div className="gm-tt-time">
                              {s.startTime} – {s.endTime}
                            </div>
                            <div className="gm-tt-name">{s.title}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTimetableSlot(s.id)}
                            className="gm-btn-slot-del"
                            title="Удалить урок"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="gm-box">
          <div className="gm-box-subtitle text-indigo">Безопасность и журнал операций</div>
          <h2 className="gm-box-title">Аудит действий администраторов и пользователей</h2>
          <p className="gm-box-desc">
            Полный журнал ключевых событий: авторизации, создание пользователей, сброс паролей и подписание ревью.
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
      )}

      {/* TAB 6: SYSTEM READINESS */}
      {activeTab === 'system' && (
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
                Prisma ORM подключена, схема синхронизирована с User, Sprint, Week, Day, DaySlot, MediaAsset, TimetableSlot, AuditLog.
              </p>
              <div className="gm-sys-badge">Status: CONNECTED &amp; OPERATIONAL</div>
            </div>

            <div className="gm-sys-card">
              <div className="gm-sys-status">
                <CheckCircle2 size={18} color="#27ae60" />
                <span>Аутентификация и GODMODE</span>
              </div>
              <p className="gm-sys-desc">
                Криптографический scrypt-хэшинг с HMAC-подписанными сессиями (mezon_session) и защитой от перебора.
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
                <span>Сервер и Домен</span>
              </div>
              <p className="gm-sys-desc">
                Деплой в Coolify с автоматическим SSL-сертификатом на diary.mezon.uz. Docker multi-stage build standalone.
              </p>
              <div className="gm-sys-badge">Domain: https://diary.mezon.uz</div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalUser && (
        <div className="gm-modal-overlay">
          <div className="gm-modal">
            <div className="gm-modal-head">
              <h3 className="gm-modal-title">Сброс пароля</h3>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="gm-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <p className="gm-modal-desc">
                Установите новый пароль для <strong>{passwordModalUser.fullName}</strong> (@
                {passwordModalUser.username}):
              </p>

              <div className="gm-form-group">
                <input
                  type="text"
                  required
                  placeholder="Новый пароль (от 8 символов)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="gm-input"
                  autoFocus
                />
              </div>

              {passwordResetStatus && (
                <div
                  className={`gm-alert-${
                    passwordResetStatus.includes('успешно') ? 'success' : 'danger'
                  }`}
                  style={{ marginBottom: 14 }}
                >
                  {passwordResetStatus}
                </div>
              )}

              <div className="gm-modal-footer">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="gm-btn-cancel"
                >
                  Отмена
                </button>
                <button type="submit" className="gm-btn-save">
                  Сохранить пароль
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Timetable Slot Modal */}
      {showAddSlotModal && (
        <div className="gm-modal-overlay">
          <div className="gm-modal">
            <div className="gm-modal-head">
              <h3 className="gm-modal-title">Добавить урок в расписание ({newSlotForm.gradeLevel} класс)</h3>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="gm-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTimetableSlot}>
              <div className="gm-form-group">
                <label className="gm-form-label">День недели</label>
                <select
                  value={newSlotForm.dayOfWeek}
                  onChange={(e) =>
                    setNewSlotForm({ ...newSlotForm, dayOfWeek: parseInt(e.target.value, 10) })
                  }
                  className="gm-select"
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {DAY_NAMES[d]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="gm-form-row">
                <div className="gm-form-group">
                  <label className="gm-form-label">Начало (ЧЧ:ММ)</label>
                  <input
                    type="text"
                    required
                    placeholder="08:30"
                    value={newSlotForm.startTime}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, startTime: e.target.value })}
                    className="gm-input"
                  />
                </div>
                <div className="gm-form-group">
                  <label className="gm-form-label">Конец (ЧЧ:ММ)</label>
                  <input
                    type="text"
                    required
                    placeholder="09:15"
                    value={newSlotForm.endTime}
                    onChange={(e) => setNewSlotForm({ ...newSlotForm, endTime: e.target.value })}
                    className="gm-input"
                  />
                </div>
              </div>

              <div className="gm-form-group">
                <label className="gm-form-label">Название предмета *</label>
                <input
                  type="text"
                  required
                  placeholder="Алгебра и мат. анализ"
                  value={newSlotForm.title}
                  onChange={(e) => setNewSlotForm({ ...newSlotForm, title: e.target.value })}
                  className="gm-input"
                />
              </div>

              <div className="gm-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="gm-btn-cancel"
                >
                  Отмена
                </button>
                <button type="submit" className="gm-btn-save">
                  Добавить в сетку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled JSX for Responsive Design */}
      <style jsx>{`
        .gm-root {
          padding: 24px 28px;
          max-width: 1400px;
          margin: 0 auto;
          color: #121212;
          box-sizing: border-box;
          width: 100%;
        }
        .gm-banner {
          background: #121212;
          color: #ffffff;
          padding: 24px 28px;
          border-left: 6px solid #a04a84;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          margin-bottom: 24px;
        }
        .gm-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .gm-badge-godmode {
          background: #a04a84;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .gm-badge-user {
          color: #fcd5a6;
          font-size: 13px;
          font-weight: 700;
        }
        .gm-title {
          font-size: 26px;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .gm-title-hl {
          background: #00859e;
          padding: 0 8px;
          color: #ffffff;
        }
        .gm-desc {
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          margin: 6px 0 0 0;
        }
        .gm-banner__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .gm-btn-register {
          background: #fcd5a6;
          color: #121212;
          border: none;
          padding: 10px 18px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .gm-btn-refresh {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 10px 14px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .gm-tabs-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }
        .gm-tabs {
          display: flex;
          gap: 6px;
          white-space: nowrap;
          min-width: max-content;
        }
        .gm-tab {
          padding: 12px 18px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #5f5f5f;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: color 0.15s, border-color 0.15s;
        }
        .gm-tab--active {
          color: #00859e;
          border-bottom-color: #00859e;
        }

        .gm-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .gm-card-metric {
          background: #f8f8f8;
          border: 1.5px solid #dcdcdc;
          padding: 18px 20px;
        }
        .gm-card-metric__label {
          color: #5f5f5f;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .gm-card-metric__value {
          font-size: 32px;
          font-weight: 900;
          color: #121212;
          margin-top: 4px;
        }
        .gm-card-metric__sub {
          font-size: 12px;
          color: #5f5f5f;
          margin-top: 4px;
          font-weight: 600;
        }

        .gm-split-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .gm-box {
          background: #ffffff;
          border: 2px solid #222222;
          padding: 24px;
          box-sizing: border-box;
        }
        .gm-box--danger {
          border-color: #c0392b;
        }
        .gm-box--narrow {
          max-width: 760px;
        }
        .gm-box-subtitle {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .gm-box-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }
        .gm-box-desc {
          color: #5f5f5f;
          font-size: 13px;
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .gm-cohorts-bars {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .gm-bar-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .gm-bar-track {
          height: 10px;
          background: #e8e8e8;
          overflow: hidden;
        }
        .gm-bar-fill {
          height: 100%;
        }
        .gm-hint-note {
          margin-top: 20px;
          padding-top: 14px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }

        .gm-danger-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c0392b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 8px;
        }
        .gm-empty-check {
          padding: 24px;
          text-align: center;
          color: #00859e;
          font-weight: 700;
          font-size: 14px;
        }
        .gm-risk-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .gm-risk-item {
          background: #fff8f7;
          border: 1px solid #fab1a0;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gm-risk-name {
          font-weight: 800;
          font-size: 14px;
        }
        .gm-risk-grade {
          font-size: 12px;
          color: #666;
          font-weight: 400;
        }
        .gm-flags-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .gm-flag-tag {
          background: #c0392b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          text-transform: uppercase;
        }
        .gm-btn-inspect {
          background: #121212;
          color: #ffffff;
          border: none;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .gm-filter-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;
        }
        .gm-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 240px;
        }
        .gm-search-input {
          flex: 1;
          padding: 9px 12px;
          border: 1.5px solid #c8c8c8;
          font-size: 14px;
          outline: none;
        }
        .gm-role-pills {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          max-width: 100%;
        }
        .gm-role-pill {
          background: #f0f0f0;
          color: #222222;
          border: none;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .gm-role-pill--active {
          background: #00859e;
          color: #ffffff;
        }

        .gm-table-container {
          overflow-x: auto;
          display: block;
        }
        .gm-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .gm-table th {
          background: #121212;
          color: #ffffff;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 12px 14px;
        }
        .gm-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #e8e8e8;
          font-size: 13px;
        }
        .gm-tr:hover {
          background: #fafafa;
        }
        .gm-td-empty {
          padding: 32px;
          text-align: center;
          color: #5f5f5f;
          font-size: 13px;
        }
        .gm-td-user {
          font-weight: 700;
        }
        .gm-user-name {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .gm-username {
          font-family: monospace;
          font-weight: 600;
        }
        .gm-email {
          font-size: 11px;
          color: #666;
        }
        .gm-td-grade {
          font-weight: 600;
        }
        .gm-muted {
          font-size: 12px;
          color: #666;
        }

        .gm-role-tag {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
        }
        .gm-role-tag--admin {
          background: #a04a84;
          color: #ffffff;
        }
        .gm-role-tag--mentor {
          background: #00859e;
          color: #ffffff;
        }
        .gm-role-tag--parent {
          background: #6b70a3;
          color: #ffffff;
        }
        .gm-role-tag--student {
          background: #fcd5a6;
          color: #121212;
        }

        .gm-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .gm-btn-act {
          border: none;
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .gm-btn-act--enter {
          background: #121212;
          color: #ffffff;
        }
        .gm-btn-act--pwd {
          background: #f0f0f0;
          color: #333333;
          border: 1px solid #d0d0d0;
        }
        .gm-btn-act--del {
          background: #fdeeed;
          color: #c0392b;
          border: 1px solid #f9d5d3;
        }

        .gm-cards-mobile {
          display: none;
        }
        .gm-user-card {
          background: #ffffff;
          border: 1.5px solid #dcdcdc;
          padding: 14px;
          margin-bottom: 10px;
        }
        .gm-user-card__head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        .gm-user-card__name {
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .gm-user-card__login {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }
        .gm-user-card__meta {
          margin-top: 8px;
          font-size: 12px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .gm-user-card__footer {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .gm-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .gm-form-group {
          margin-bottom: 16px;
        }
        .gm-form-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .gm-input,
        .gm-select {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid #c8c8c8;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          background: #ffffff;
        }
        .gm-input:focus,
        .gm-select:focus {
          border-color: #00859e;
        }
        .gm-role-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .gm-role-choice {
          padding: 10px 8px;
          background: #f0f0f0;
          color: #222222;
          border: 2px solid transparent;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .gm-role-choice--active {
          background: #121212;
          color: #ffffff;
          border-color: #a04a84;
        }
        .gm-btn-submit {
          background: #00859e;
          color: #ffffff;
          border: none;
          padding: 14px 24px;
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .gm-alert-success {
          background: #e8f8f5;
          border: 1px solid #2ecc71;
          color: #27ae60;
          padding: 12px 14px;
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gm-alert-danger {
          background: #fdeeed;
          border: 1px solid #e74c3c;
          color: #c0392b;
          padding: 12px 14px;
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .gm-tt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .gm-tt-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .gm-grade-pills {
          display: flex;
          gap: 6px;
        }
        .gm-grade-pill {
          background: #f0f0f0;
          color: #222222;
          border: none;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .gm-grade-pill--active {
          background: #00859e;
          color: #ffffff;
        }
        .gm-btn-add-slot {
          background: #121212;
          color: #ffffff;
          border: none;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .gm-tt-days {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .gm-tt-day {
          background: #f9f9f9;
          border: 1.5px solid #dcdcdc;
          padding: 14px;
        }
        .gm-tt-day-title {
          font-weight: 800;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 2px solid #222222;
        }
        .gm-tt-empty {
          color: #888;
          font-size: 12px;
          padding: 12px 0;
          text-align: center;
        }
        .gm-tt-slot-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gm-tt-slot {
          background: #ffffff;
          border: 1px solid #d8d8d8;
          padding: 8px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }
        .gm-tt-time {
          font-family: monospace;
          font-size: 11px;
          color: #00859e;
          font-weight: 700;
        }
        .gm-tt-name {
          font-size: 13px;
          font-weight: 700;
          margin-top: 2px;
        }
        .gm-btn-slot-del {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
        }
        .gm-btn-slot-del:hover {
          color: #c0392b;
        }

        .gm-audit-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 520px;
          overflow-y: auto;
        }
        .gm-audit-entry {
          background: #f9f9f9;
          border-left: 3px solid #6b70a3;
          padding: 10px 14px;
          font-size: 13px;
        }
        .gm-audit-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .gm-audit-action {
          font-weight: 800;
          color: #6b70a3;
          text-transform: uppercase;
        }
        .gm-audit-time {
          color: #888;
        }
        .gm-audit-body {
          color: #222;
        }

        .gm-system-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        .gm-sys-card {
          border: 1px solid #c8c8c8;
          padding: 18px;
          background: #f9f9f9;
        }
        .gm-sys-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #27ae60;
          font-weight: 800;
          font-size: 14px;
        }
        .gm-sys-desc {
          font-size: 13px;
          color: #5f5f5f;
          margin: 8px 0;
          line-height: 1.4;
        }
        .gm-sys-badge {
          font-size: 11px;
          font-family: monospace;
          background: #ffffff;
          padding: 6px 8px;
          border: 1px solid #e0e0e0;
          color: #222;
        }

        .gm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 16px;
        }
        .gm-modal {
          background: #ffffff;
          border: 2px solid #222222;
          padding: 24px;
          width: 100%;
          maxWidth: 460px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3);
        }
        .gm-modal-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .gm-modal-title {
          font-size: 17px;
          font-weight: 800;
          margin: 0;
        }
        .gm-modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
        }
        .gm-modal-desc {
          font-size: 13px;
          color: #555;
          margin: 0 0 16px 0;
        }
        .gm-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 18px;
        }
        .gm-btn-cancel {
          background: #f0f0f0;
          color: #333;
          border: none;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .gm-btn-save {
          background: #00859e;
          color: #fff;
          border: none;
          padding: 10px 18px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
        }

        .text-teal {
          color: #00859e;
        }
        .text-magenta {
          color: #a04a84;
        }
        .text-indigo {
          color: #6b70a3;
        }
        .text-red {
          color: #c0392b;
        }
        .bg-teal {
          background-color: #00859e;
        }
        .bg-magenta {
          background-color: #a04a84;
        }
        .bg-indigo {
          background-color: #6b70a3;
        }
        .font-semibold {
          font-weight: 600;
        }
        .font-bold {
          font-weight: 700;
        }

        /* Mobile specific media query */
        @media (max-width: 768px) {
          .gm-root {
            padding: 16px 12px;
          }
          .gm-banner {
            padding: 18px 16px;
          }
          .gm-banner__actions {
            width: 100%;
          }
          .gm-btn-register,
          .gm-btn-refresh {
            flex: 1;
            justify-content: center;
          }
          .gm-split-grid {
            grid-template-columns: 1fr;
          }
          .gm-form-row {
            grid-template-columns: 1fr;
          }
          .gm-role-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .gm-table-container {
            display: none;
          }
          .gm-cards-mobile {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};
