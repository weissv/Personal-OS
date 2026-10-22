'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Sun,
  Moon,
  Hammer,
  RotateCw,
  Compass,
  ShieldCheck,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';

export type ViewMode = 'morning' | 'evening' | 'saturday' | 'retro' | 'mentor' | 'parent' | 'godmode';

interface DemoUser {
  id: string;
  fullName: string;
  username?: string | null;
  email: string;
  role: string;
  gradeLevel?: number | null;
}

interface NavigationHeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  currentUser: DemoUser | null;
  availableUsers: DemoUser[];
  onSwitchUser: (userId: string) => void;
  isMobileDeviceFrame: boolean;
  onToggleDeviceFrame: () => void;
  selectedWeekNumber: number;
  isGodmode?: boolean;
  isImpersonating?: boolean;
  onRevertToAdmin?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Ученик',
  MENTOR: 'Куратор',
  PARENT: 'Родитель',
  ADMIN: 'Основатель (Godmode)',
};

// Cooper: персоны. Каждая роль видит только те режимы, которые нужны для её цели.
const NAV: Array<{
  view: ViewMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
  roles: string[];
}> = [
  { view: 'godmode', label: 'Godmode', hint: 'Школа', icon: <Sparkles size={22} />, roles: ['ADMIN'] },
  { view: 'morning', label: 'Утро', hint: '07:30', icon: <Sun size={22} />, roles: ['STUDENT'] },
  { view: 'evening', label: 'Вечер', hint: '16:45', icon: <Moon size={22} />, roles: ['STUDENT'] },
  { view: 'saturday', label: 'Сб', hint: 'проект', icon: <Hammer size={22} />, roles: ['STUDENT'] },
  { view: 'retro', label: 'Вс', hint: 'ретро', icon: <RotateCw size={22} />, roles: ['STUDENT'] },
  { view: 'mentor', label: 'Куратор', hint: '9 «А»', icon: <Compass size={22} />, roles: ['MENTOR'] },
  { view: 'parent', label: 'Родитель', hint: 'доверие', icon: <ShieldCheck size={22} />, roles: ['PARENT'] },
];

function archetype(u: DemoUser): string {
  if (u.username === 'somi' || u.role === 'ADMIN') return '⚡ Полный GODMODE';
  if (u.email === 'davron@mezon.uz' || u.username === 'davron') return 'Эталон субъектности';
  if (u.email === 'leila@mezon.uz' || u.username === 'leila') return 'Флаг: >50% переносов';
  if (u.email === 'sardor@mezon.uz' || u.username === 'sardor') return 'Флаги: пустая суббота, ретро-отписки';
  if (u.role === 'MENTOR') return 'Куратор 9 «А»';
  if (u.role === 'PARENT') return 'Родитель · Selective Trust';
  return '';
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentView,
  onViewChange,
  currentUser,
  availableUsers,
  onSwitchUser,
  isMobileDeviceFrame,
  onToggleDeviceFrame,
  selectedWeekNumber,
  isGodmode = false,
  isImpersonating = false,
  onRevertToAdmin,
  onLogout,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role = currentUser?.role;
  let items = role ? NAV.filter((n) => n.roles.includes(role)) : NAV;
  // If user is Godmode, allow accessing the godmode tab even while testing other roles
  if (isGodmode && !items.some((i) => i.view === 'godmode')) {
    items = [{ view: 'godmode', label: 'Godmode', hint: 'Школа', icon: <Sparkles size={22} />, roles: ['ADMIN'] }, ...items];
  }

  return (
    <>
      {/* Impersonation top strip */}
      {isImpersonating && (
        <div
          style={{
            background: 'linear-gradient(90deg, #a04a84, #873b6d)',
            color: '#fff',
            padding: '8px 24px',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} color="#fcd5a6" />
            <span>
              ⚡ Режим имперсонации: Просмотр от лица <strong>{currentUser?.fullName}</strong> ({ROLE_LABEL[role || ''] || role})
            </span>
          </div>
          <button
            type="button"
            onClick={onRevertToAdmin}
            style={{
              background: '#fcd5a6',
              color: '#121212',
              border: 'none',
              padding: '4px 12px',
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            ⚡ Вернуться в Godmode
          </button>
        </div>
      )}

      {/* Полоса экосистемы: связь с mezon.uz */}
      <div className="mz-strip">
        <div className="mz-strip__inner">
          <div className="mz-strip__text">
            <span className="mz-chip mz-chip--peach">Экосистема Mezon</span>
            <span className="t">
              Sprint OS — продолжение школы <strong>Mezon Inspiring School</strong>: «Образование — это сама жизнь»
            </span>
          </div>
          <a className="site" href="https://mezon.uz/" target="_blank" rel="noopener noreferrer">
            mezon.uz <ExternalLink size={11} style={{ display: 'inline', marginLeft: 4 }} />
          </a>
        </div>
      </div>

      <header className="mz-header">
        <div className="mz-logo" onClick={() => isGodmode && onViewChange('godmode')} style={{ cursor: isGodmode ? 'pointer' : 'default' }}>
          <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={118} height={53} priority />
          <div className="mz-logo__os">
            Sprint OS
            <span>1 четверть · 2026</span>
          </div>
        </div>

        <div className="mz-header__right">
          {currentView !== 'godmode' && (
            <div className="mz-header__week">
              <small>Спринт</small>
              <b className="mz-num">Неделя {selectedWeekNumber} / 10</b>
            </div>
          )}

          {isGodmode && currentView !== 'godmode' && (
            <button
              type="button"
              onClick={() => onViewChange('godmode')}
              style={{
                background: '#a04a84',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '0.5px',
              }}
            >
              <Sparkles size={14} />
              <span>⚡ Godmode</span>
            </button>
          )}

          <button
            type="button"
            className="mz-device"
            aria-pressed={isMobileDeviceFrame}
            onClick={onToggleDeviceFrame}
            title={isMobileDeviceFrame ? 'Переключить в полный экран' : 'Показать как телефон 390px'}
          >
            {isMobileDeviceFrame ? <Smartphone size={16} /> : <Monitor size={16} />}
            <span>{isMobileDeviceFrame ? '390 px' : 'Desktop'}</span>
          </button>

          <div style={{ position: 'relative', display: 'flex' }}>
            <button
              type="button"
              className="mz-user"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <div className="mz-user__ava" style={{ background: role === 'ADMIN' ? '#a04a84' : undefined, color: '#fff' }}>
                {currentUser?.fullName?.charAt(0) || '?'}
              </div>
              <div className="mz-user__meta">
                <small>{(role && ROLE_LABEL[role]) || 'Гость'}</small>
                <b>{currentUser?.fullName || 'Загрузка…'}</b>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="mz-backdrop"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="mz-menu" role="menu">
                  <div className="mz-menu__head">
                    <div className="mz-tag" style={{ marginBottom: 0 }}>
                      {isGodmode ? 'Имперсонация / Профиль' : 'Текущий профиль'}
                    </div>
                    <button
                      type="button"
                      className="mz-link"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-soft)' }}
                    >
                      ✕ Закрыть
                    </button>
                  </div>

                  {isGodmode && availableUsers.length > 0 && (
                    <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          role="menuitem"
                          className="mz-menu__item"
                          aria-current={u.id === currentUser?.id}
                          onClick={() => {
                            onSwitchUser(u.id);
                            setUserMenuOpen(false);
                          }}
                        >
                          <b>{u.fullName}</b>
                          <small>
                            {ROLE_LABEL[u.role] || u.role} · {archetype(u)}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #e0e0e0', padding: '8px 12px', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#c0392b',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 0',
                        width: '100%',
                      }}
                    >
                      <LogOut size={15} />
                      <span>Выйти из аккаунта</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mz-shell">
        {/* Левая рейка (desktop) */}
        <nav className="mz-rail" aria-label="Режимы дня">
          {items.map((n) => (
            <button
              key={n.view}
              type="button"
              className="mz-nav"
              aria-current={currentView === n.view ? 'page' : undefined}
              onClick={() => onViewChange(n.view)}
            >
              {n.icon}
              {n.label}
              <small>{n.hint}</small>
            </button>
          ))}
          <div className="mz-rail__spacer" />
          <div className="mz-rail__sep" />
          <a
            className="mz-nav"
            href="https://mezon.uz/"
            target="_blank"
            rel="noopener noreferrer"
            title="Сайт школы Mezon"
          >
            <ExternalLink size={20} />
            Школа
            <small>mezon.uz</small>
          </a>
        </nav>

        {children}
      </div>

      {/* Нижняя панель (mobile) */}
      <nav className="mz-tabbar" aria-label="Режимы дня">
        {items.map((n) => (
          <button
            key={n.view}
            type="button"
            className="mz-nav"
            aria-current={currentView === n.view ? 'page' : undefined}
            onClick={() => onViewChange(n.view)}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>
    </>
  );
};
