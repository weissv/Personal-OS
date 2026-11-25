'use client';

import React, { useState } from 'react';
import { Search, Eye, KeyRound, Trash2, Power, Pencil } from 'lucide-react';
import { AdminUser } from './types';

interface AdminUsersTabProps {
  users: AdminUser[];
  onSwitchToUser: (userId: string) => void;
  onOpenPasswordModal: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onEditUser: (user: AdminUser) => void;
}

const ROLE_RU: Record<AdminUser['role'], string> = {
  STUDENT: 'Ученик',
  MENTOR: 'Куратор',
  PARENT: 'Родитель',
  ADMIN: 'Админ',
};

const ROOT_ADMIN = 'somi';

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onSwitchToUser,
  onOpenPasswordModal,
  onDeleteUser,
  onToggleActive,
  onEditUser,
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
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Поиск пользователей"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, логину или email…"
            className="gm-search-input"
          />
        </div>

        <div className="gm-role-pills" role="group" aria-label="Фильтр по роли">
          {(['ALL', 'STUDENT', 'MENTOR', 'PARENT', 'ADMIN'] as const).map((r) => {
            const count = r === 'ALL' ? users.length : users.filter((u) => u.role === r).length;
            const label =
              r === 'ALL' ? 'Все' : r === 'STUDENT' ? 'Ученики' : r === 'MENTOR' ? 'Кураторы' : r === 'PARENT' ? 'Родители' : 'Админы';
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                aria-pressed={roleFilter === r}
                className={`gm-role-pill ${roleFilter === r ? 'gm-role-pill--active' : ''}`}
              >
                {label} <span className="gm-pill-count">{count}</span>
              </button>
            );
          })}
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
              <th className="mz-ta-right">Действия</th>
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
                <tr key={u.id} className={`gm-tr ${u.isActive ? '' : 'gm-tr--inactive'}`}>
                  <td className="gm-td-user">
                    <div className="gm-user-name">
                      {u.username === ROOT_ADMIN && <span className="text-magenta" aria-label="Главный администратор">⚡</span>}
                      <span>{u.fullName}</span>
                      {!u.isActive && <span className="gm-status-off">Отключён</span>}
                    </div>
                    <div className="gm-email">{u.lastLoginAt ? `Вход: ${new Date(u.lastLoginAt).toLocaleDateString('ru-RU')}` : 'Ещё не входил'}</div>
                  </td>
                  <td>
                    <div className="gm-username">@{u.username || '—'}</div>
                    <div className="gm-email">{u.email}</div>
                  </td>
                  <td>
                    <span className={`gm-role-tag gm-role-tag--${u.role.toLowerCase()}`}>
                      {ROLE_RU[u.role]}
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
                        {u.students && u.students.length > 0
                          ? u.students.map((st) => st.fullName).join(', ')
                          : 'Не привязан'}
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
                  <td className="mz-ta-right">
                    <UserActions u={u} compact onSwitchToUser={onSwitchToUser} onOpenPasswordModal={onOpenPasswordModal} onDeleteUser={onDeleteUser} onToggleActive={onToggleActive} onEditUser={onEditUser} />
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
            <div key={u.id} className={`gm-user-card ${u.isActive ? '' : 'gm-tr--inactive'}`}>
              <div className="gm-user-card__head">
                <div>
                  <div className="gm-user-card__name">
                    {u.username === ROOT_ADMIN && <span className="text-magenta">⚡</span>}
                    {u.fullName}
                    {!u.isActive && <span className="gm-status-off">Отключён</span>}
                  </div>
                  <div className="gm-user-card__login">@{u.username || '—'} · {u.email}</div>
                </div>
                <span className={`gm-role-tag gm-role-tag--${u.role.toLowerCase()}`}>
                  {ROLE_RU[u.role]}
                </span>
              </div>

              <div className="gm-user-card__meta">
                {u.gradeLevel && <span>Класс: {u.gradeLevel}</span>}
                {u.role === 'STUDENT' && (
                  <span className="text-teal font-semibold">
                    {u.sprintsCount > 0 ? `${u.sprintsCount} спринт` : 'Без спринта'}
                  </span>
                )}
                {u.role === 'PARENT' && u.students && u.students.length > 0 && (
                  <span>Ученик: {u.students[0].fullName}</span>
                )}
              </div>

              <div className="gm-user-card__footer">
                <UserActions u={u} onSwitchToUser={onSwitchToUser} onOpenPasswordModal={onOpenPasswordModal} onDeleteUser={onDeleteUser} onToggleActive={onToggleActive} onEditUser={onEditUser} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface UserActionsProps {
  u: AdminUser;
  compact?: boolean;
  onSwitchToUser: (userId: string) => void;
  onOpenPasswordModal: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onEditUser: (user: AdminUser) => void;
}

/** Действия над пользователем — общие для таблицы и мобильных карточек. */
const UserActions: React.FC<UserActionsProps> = ({ u, compact, onSwitchToUser, onOpenPasswordModal, onDeleteUser, onToggleActive, onEditUser }) => {
  const isRoot = u.username === ROOT_ADMIN;
  return (
    <div className="gm-actions-row">
      {!isRoot && u.isActive && (
        <button type="button" onClick={() => onSwitchToUser(u.id)} title={`Войти от лица ${u.fullName}`} className="gm-btn-act gm-btn-act--enter">
          <Eye size={12} />
          <span>Войти</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => onEditUser(u)}
        title="Редактировать профиль"
        aria-label={`Редактировать: ${u.fullName}`}
        className="gm-btn-act gm-btn-act--pwd"
      >
        <Pencil size={12} />
        {!compact && <span>Профиль</span>}
      </button>
      <button
        type="button"
        onClick={() => onOpenPasswordModal(u)}
        title="Сбросить пароль"
        aria-label={`Сбросить пароль: ${u.fullName}`}
        className="gm-btn-act gm-btn-act--pwd"
      >
        <KeyRound size={12} />
        {!compact && <span>Пароль</span>}
      </button>
      {!isRoot && (
        <button
          type="button"
          onClick={() => onToggleActive(u)}
          title={u.isActive ? 'Отключить доступ (данные сохранятся)' : 'Включить доступ'}
          aria-label={`${u.isActive ? 'Отключить' : 'Включить'}: ${u.fullName}`}
          className={`gm-btn-act ${u.isActive ? 'gm-btn-act--off' : 'gm-btn-act--on'}`}
        >
          <Power size={12} />
          {!compact && <span>{u.isActive ? 'Отключить' : 'Включить'}</span>}
        </button>
      )}
      {!isRoot && (
        <button
          type="button"
          onClick={() => onDeleteUser(u)}
          title="Удалить пользователя"
          aria-label={`Удалить: ${u.fullName}`}
          className="gm-btn-act gm-btn-act--del"
        >
          <Trash2 size={12} />
          {!compact && <span>Удалить</span>}
        </button>
      )}
    </div>
  );
};
