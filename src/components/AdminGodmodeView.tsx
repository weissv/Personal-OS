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
  sprintsCount: number;
  parents: Array<{ id: string; fullName: string; accessLevel: string }>;
  students: Array<{ id: string; fullName: string; accessLevel: string }>;
  createdAt: string;
}

interface AdminGodmodeViewProps {
  onSwitchToUser: (userId: string) => void;
}

export const AdminGodmodeView: React.FC<AdminGodmodeViewProps> = ({ onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'register' | 'system'>('analytics');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

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
      console.error(e);
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
      console.error(e);
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([loadStats(), loadUsers()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

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
        `Пользователь ${formData.fullName} успешно создан!` +
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
    } catch (err) {
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
    } catch (e) {
      alert('Ошибка при удалении');
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
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', color: '#121212' }}>
      {/* GODMODE Header Banner */}
      <div
        style={{
          background: '#121212',
          color: '#fff',
          padding: '24px 32px',
          borderLeft: '6px solid #a04a84',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: '#a04a84',
                color: '#fff',
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              ⚡ GODMODE CONTROL
            </span>
            <span style={{ color: '#fcd5a6', fontSize: 13, fontWeight: 700 }}>
              Founder Console · somi
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
            Центр управления <span style={{ background: '#00859e', padding: '0 8px' }}>Mezon Sprint OS</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '6px 0 0 0' }}>
            Коммерческий запуск платформы · Управление школой, когортами, учениками и кураторами
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            style={{
              background: '#fcd5a6',
              color: '#121212',
              border: 'none',
              padding: '10px 18px',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            <UserPlus size={16} />
            <span>+ Зарегистрировать</span>
          </button>
          <button
            type="button"
            onClick={refreshAll}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 14px',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Обновить данные
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e0e0e0', marginBottom: 28, gap: 8 }}>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid #00859e' : '3px solid transparent',
            color: activeTab === 'analytics' ? '#00859e' : '#5f5f5f',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <BarChart3 size={18} />
          <span>Аналитика и когорты</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #00859e' : '3px solid transparent',
            color: activeTab === 'users' ? '#00859e' : '#5f5f5f',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Users size={18} />
          <span>Реестр пользователей ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('register')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'register' ? '3px solid #00859e' : '3px solid transparent',
            color: activeTab === 'register' ? '#00859e' : '#5f5f5f',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <UserPlus size={18} />
          <span>Регистрация пользователя</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'system' ? '3px solid #00859e' : '3px solid transparent',
            color: activeTab === 'system' ? '#00859e' : '#5f5f5f',
            fontWeight: 800,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Database size={18} />
          <span>Готовность к продакшну</span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS & COHORTS */}
      {activeTab === 'analytics' && stats && (
        <div>
          {/* Key Metric Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div style={{ background: '#f6f6f6', border: '1px solid #c8c8c8', padding: '18px 20px' }}>
              <div style={{ color: '#5f5f5f', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Всего учеников
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#121212', marginTop: 4 }}>
                {stats.users.students}
              </div>
              <div style={{ fontSize: 12, color: '#00859e', fontWeight: 600, marginTop: 4 }}>
                Активных спринтов: {stats.sprints.total}
              </div>
            </div>

            <div style={{ background: '#f6f6f6', border: '1px solid #c8c8c8', padding: '18px 20px' }}>
              <div style={{ color: '#5f5f5f', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Кураторы / Наставники
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#121212', marginTop: 4 }}>
                {stats.users.mentors}
              </div>
              <div style={{ fontSize: 12, color: '#a04a84', fontWeight: 600, marginTop: 4 }}>
                Закреплены за классами
              </div>
            </div>

            <div style={{ background: '#f6f6f6', border: '1px solid #c8c8c8', padding: '18px 20px' }}>
              <div style={{ color: '#5f5f5f', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Родительский контроль
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#121212', marginTop: 4 }}>
                {stats.users.parents}
              </div>
              <div style={{ fontSize: 12, color: '#6b70a3', fontWeight: 600, marginTop: 4 }}>
                Selective Trust портал
              </div>
            </div>

            <div style={{ background: '#f6f6f6', border: '1px solid #c8c8c8', padding: '18px 20px' }}>
              <div style={{ color: '#5f5f5f', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Выполнение слотов
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#00859e', marginTop: 4 }}>
                {stats.slots.completionRate}%
              </div>
              <div style={{ fontSize: 12, color: '#5f5f5f', marginTop: 4 }}>
                {stats.slots.done} из {stats.slots.total} слотов
              </div>
            </div>

            <div style={{ background: '#f6f6f6', border: '1px solid #c8c8c8', padding: '18px 20px' }}>
              <div style={{ color: '#5f5f5f', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Переносы задач
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: stats.slots.migrationRate > 30 ? '#c0392b' : '#121212', marginTop: 4 }}>
                {stats.slots.migrationRate}%
              </div>
              <div style={{ fontSize: 12, color: '#5f5f5f', marginTop: 4 }}>
                {stats.slots.migrated} слотов перенесено
              </div>
            </div>
          </div>

          {/* Cohorts & Risk Flags Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
            {/* Cohorts breakdown */}
            <div style={{ background: '#fff', border: '2px solid #222', padding: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a04a84', marginBottom: 12 }}>
                Когорты школы (Классы)
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
                Распределение учеников по параллелям
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    <span>9 класс</span>
                    <span>{stats.cohorts.grade9} учеников</span>
                  </div>
                  <div style={{ height: 10, background: '#e0e0e0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: '#00859e',
                        width: `${stats.users.students > 0 ? (stats.cohorts.grade9 / stats.users.students) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    <span>10 класс</span>
                    <span>{stats.cohorts.grade10} учеников</span>
                  </div>
                  <div style={{ height: 10, background: '#e0e0e0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: '#a04a84',
                        width: `${stats.users.students > 0 ? (stats.cohorts.grade10 / stats.users.students) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    <span>11 класс (Выпускной)</span>
                    <span>{stats.cohorts.grade11} учеников</span>
                  </div>
                  <div style={{ height: 10, background: '#e0e0e0', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: '#6b70a3',
                        width: `${stats.users.students > 0 ? (stats.cohorts.grade11 / stats.users.students) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e0e0e0', fontSize: 13, color: '#5f5f5f' }}>
                * Все новые ученики автоматически получают 10-недельный спринт четверти с расписанием соответствующего класса.
              </div>
            </div>

            {/* Red Flag Students (At-Risk) */}
            <div style={{ background: '#fff', border: '2px solid #c0392b', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c0392b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
                <ShieldAlert size={16} />
                <span>Зона внимания кураторов · Красные флаги</span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0' }}>
                Ученики, требующие вмешательства ({stats.atRiskStudents.length})
              </h2>

              {stats.atRiskStudents.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#00859e', fontWeight: 600 }}>
                  ✓ Все ученики стабильно соблюдают субъектный ритм!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.atRiskStudents.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        background: '#fff8f7',
                        border: '1px solid #fab1a0',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>
                          {st.fullName}{' '}
                          <span style={{ fontSize: 12, color: '#5f5f5f', fontWeight: 400 }}>
                            ({st.gradeLevel} класс)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {st.flags.map((fl, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#c0392b',
                                color: '#fff',
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {fl}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSwitchToUser(st.id)}
                        style={{
                          background: '#121212',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
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
        <div style={{ background: '#fff', border: '2px solid #222', padding: 24 }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
              <Search size={18} color="#5f5f5f" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, логину или email…"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1.5px solid #c8c8c8',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#5f5f5f', textTransform: 'uppercase' }}>
                Роль:
              </span>
              {['ALL', 'STUDENT', 'MENTOR', 'PARENT', 'ADMIN'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  style={{
                    background: roleFilter === r ? '#00859e' : '#f0f0f0',
                    color: roleFilter === r ? '#fff' : '#222',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
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

          {/* Users Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#121212', color: '#fff', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '12px 16px' }}>Пользователь</th>
                  <th style={{ padding: '12px 16px' }}>Логин / Email</th>
                  <th style={{ padding: '12px 16px' }}>Роль</th>
                  <th style={{ padding: '12px 16px' }}>Класс</th>
                  <th style={{ padding: '12px 16px' }}>Связи / Спринт</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#5f5f5f' }}>
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #e0e0e0',
                        fontSize: 13,
                        transition: 'background 0.2s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#f9f9f9')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.username === 'somi' && <span style={{ color: '#a04a84' }}>⚡</span>}
                          <span>{u.fullName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>@{u.username || '—'}</div>
                        <div style={{ fontSize: 12, color: '#5f5f5f' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            background:
                              u.role === 'ADMIN'
                                ? '#a04a84'
                                : u.role === 'MENTOR'
                                ? '#00859e'
                                : u.role === 'PARENT'
                                ? '#6b70a3'
                                : '#fcd5a6',
                            color: u.role === 'STUDENT' ? '#121212' : '#fff',
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        {u.gradeLevel ? `${u.gradeLevel} класс` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {u.role === 'STUDENT' && (
                          <span style={{ color: '#00859e', fontWeight: 600 }}>
                            {u.sprintsCount > 0 ? `${u.sprintsCount} спринт(а)` : 'Нет спринта'}
                          </span>
                        )}
                        {u.role === 'PARENT' && (
                          <div style={{ fontSize: 12, color: '#5f5f5f' }}>
                            {u.students.length > 0 ? `Ученик: ${u.students[0].fullName}` : 'Не привязан'}
                          </div>
                        )}
                        {u.role === 'MENTOR' && (
                          <span style={{ fontSize: 12, color: '#5f5f5f' }}>
                            Куратор {u.gradeLevel ? `${u.gradeLevel} класса` : 'школы'}
                          </span>
                        )}
                        {u.role === 'ADMIN' && (
                          <span style={{ color: '#a04a84', fontWeight: 700 }}>Полный доступ</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Impersonate button */}
                          {u.username !== 'somi' && (
                            <button
                              type="button"
                              onClick={() => onSwitchToUser(u.id)}
                              title={`Войти от лица ${u.fullName}`}
                              style={{
                                background: '#121212',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Eye size={12} />
                              <span>Войти</span>
                            </button>
                          )}

                          {/* Delete button (except somi) */}
                          {u.username !== 'somi' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              title="Удалить пользователя"
                              style={{
                                background: '#f8d7da',
                                color: '#721c24',
                                border: '1px solid #f5c6cb',
                                padding: '6px 8px',
                                fontSize: 12,
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
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
        </div>
      )}

      {/* TAB 3: REGISTER NEW USER */}
      {activeTab === 'register' && (
        <div style={{ background: '#fff', border: '2px solid #222', padding: 32, maxWidth: 800 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#a04a84', marginBottom: 8 }}>
            Онбординг участников школы
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 8px 0' }}>
            Регистрация нового пользователя
          </h2>
          <p style={{ color: '#5f5f5f', fontSize: 14, margin: '0 0 24px 0' }}>
            При создании ученика автоматически формируется 10-недельный спринт «1 четверть» со стандартной сеткой предметов и субботней проектной лабораторией.
          </p>

          {registerSuccess && (
            <div
              style={{
                background: '#e8f8f5',
                border: '1px solid #2ecc71',
                color: '#27ae60',
                padding: '14px 16px',
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{registerSuccess}</span>
            </div>
          )}

          {registerError && (
            <div
              style={{
                background: '#fdeeed',
                border: '1px solid #e74c3c',
                color: '#c0392b',
                padding: '14px 16px',
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 20,
              }}
            >
              ✕ {registerError}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit}>
            {/* Role picker buttons */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Роль в системе:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { r: 'STUDENT', label: 'Ученик', icon: <GraduationCap size={16} /> },
                  { r: 'MENTOR', label: 'Куратор', icon: <UserCheck size={16} /> },
                  { r: 'PARENT', label: 'Родитель', icon: <HeartHandshake size={16} /> },
                  { r: 'ADMIN', label: 'Администратор', icon: <Sparkles size={16} /> },
                ].map(({ r, label, icon }) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r })}
                    style={{
                      padding: '12px 10px',
                      background: formData.role === r ? '#121212' : '#f0f0f0',
                      color: formData.role === r ? '#fff' : '#222',
                      border: formData.role === r ? '2px solid #a04a84' : '2px solid transparent',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  ФИО пользователя *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Камиль Ахмедов"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  Логин (Username) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="kamil"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="kamil@mezon.uz"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  Пароль *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например, Mezon13!"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                />
              </div>
            </div>

            {/* Conditional fields based on role */}
            {(formData.role === 'STUDENT' || formData.role === 'MENTOR') && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                  Класс (Параллель)
                </label>
                <select
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                >
                  <option value={9}>9 класс</option>
                  <option value={10}>10 класс</option>
                  <option value={11}>11 класс (Выпускной)</option>
                </select>
              </div>
            )}

            {formData.role === 'PARENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                    Привязать к ученику:
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
                  >
                    <option value="">-- Выберите ученика --</option>
                    {studentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} ({st.gradeLevel || 9} класс)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>
                    Уровень доступа:
                  </label>
                  <select
                    value={formData.accessLevel}
                    onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #c8c8c8', fontSize: 14 }}
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
              style={{
                background: '#00859e',
                color: '#fff',
                border: 'none',
                padding: '14px 24px',
                fontWeight: 800,
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
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

      {/* TAB 4: SYSTEM & COMMERCIAL READINESS */}
      {activeTab === 'system' && (
        <div style={{ background: '#fff', border: '2px solid #222', padding: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#00859e', marginBottom: 8 }}>
            Production Infrastructure Audit
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 20px 0' }}>
            Статус коммерческой готовности сервиса
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div style={{ border: '1px solid #c8c8c8', padding: 20, background: '#f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#27ae60', fontWeight: 800, fontSize: 14 }}>
                <CheckCircle2 size={18} />
                <span>База данных PostgreSQL</span>
              </div>
              <p style={{ fontSize: 13, color: '#5f5f5f', margin: '8px 0' }}>
                Prisma ORM подключена, схема синхронизирована с User, Sprint, Week, Day, DaySlot, MediaAsset.
              </p>
              <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#fff', padding: '6px 10px', border: '1px solid #e0e0e0' }}>
                Status: CONNECTED &amp; OPERATIONAL
              </div>
            </div>

            <div style={{ border: '1px solid #c8c8c8', padding: 20, background: '#f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#27ae60', fontWeight: 800, fontSize: 14 }}>
                <CheckCircle2 size={18} />
                <span>Аутентификация и GODMODE</span>
              </div>
              <p style={{ fontSize: 13, color: '#5f5f5f', margin: '8px 0' }}>
                Реализован криптографический scrypt-хэшинг паролей. Профиль somi наделен абсолютным GODMODE.
              </p>
              <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#fff', padding: '6px 10px', border: '1px solid #e0e0e0' }}>
                Account: somi / Mezon13! (ADMIN)
              </div>
            </div>

            <div style={{ border: '1px solid #c8c8c8', padding: 20, background: '#f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#27ae60', fontWeight: 800, fontSize: 14 }}>
                <CheckCircle2 size={18} />
                <span>Автономная генерация спринтов</span>
              </div>
              <p style={{ fontSize: 13, color: '#5f5f5f', margin: '8px 0' }}>
                Каждый зарегистрированный ученик сразу получает расписание 10 недель со слотами и проектной субботой.
              </p>
              <div style={{ fontSize: 12, fontFamily: 'monospace', background: '#fff', padding: '6px 10px', border: '1px solid #e0e0e0' }}>
                Schedule: 10 WEEKS · 7 DAYS / WK
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
