'use client';

import React, { useState } from 'react';
import { Search, Eye, KeyRound, Trash2 } from 'lucide-react';
import { AdminUser } from './types';

interface AdminUsersTabProps {
  users: AdminUser[];
  onSwitchToUser: (userId: string) => void;
  onOpenPasswordModal: (user: AdminUser) => void;
  onDeleteUser: (userId: string, fullName: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onSwitchToUser,
  onOpenPasswordModal,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchQuery && matchRole;
  });

  return (
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
                        onClick={() => onOpenPasswordModal(u)}
                        title="Сменить пароль"
                        className="gm-btn-act gm-btn-act--pwd"
                      >
                        <KeyRound size={12} />
                      </button>
                      {u.username !== 'somi' && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u.id, u.fullName)}
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
                  onClick={() => onOpenPasswordModal(u)}
                  className="gm-btn-act gm-btn-act--pwd"
                >
                  <KeyRound size={12} />
                  <span>Пароль</span>
                </button>
                {u.username !== 'somi' && (
                  <button
                    type="button"
                    onClick={() => onDeleteUser(u.id, u.fullName)}
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
  );
};
