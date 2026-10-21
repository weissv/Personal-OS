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
} from 'lucide-react';

export type ViewMode = 'morning' | 'evening' | 'saturday' | 'retro' | 'mentor' | 'parent';

interface DemoUser {
  id: string;
  fullName: string;
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
  children: React.ReactNode;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'Ученик',
  MENTOR: 'Куратор',
  PARENT: 'Родитель',
};

// Cooper: персоны. Каждая роль видит только те режимы, которые нужны для её цели.
const NAV: Array<{
  view: ViewMode;
  label: string;
  hint: string;
  icon: React.ReactNode;
  roles: string[];
}> = [
  { view: 'morning', label: 'Утро', hint: '07:30', icon: <Sun size={22} />, roles: ['STUDENT'] },
  { view: 'evening', label: 'Вечер', hint: '16:45', icon: <Moon size={22} />, roles: ['STUDENT'] },
  { view: 'saturday', label: 'Сб', hint: 'проект', icon: <Hammer size={22} />, roles: ['STUDENT'] },
  { view: 'retro', label: 'Вс', hint: 'ретро', icon: <RotateCw size={22} />, roles: ['STUDENT'] },
  { view: 'mentor', label: 'Куратор', hint: '9 «А»', icon: <Compass size={22} />, roles: ['MENTOR'] },
  { view: 'parent', label: 'Родитель', hint: 'доверие', icon: <ShieldCheck size={22} />, roles: ['PARENT'] },
];

function archetype(u: DemoUser): string {
  if (u.email === 'davron@mezon.uz') return 'Эталон субъектности';
  if (u.email === 'leila@mezon.uz') return 'Флаг: >50% переносов';
  if (u.email === 'sardor@mezon.uz') return 'Флаги: пустая суббота, ретро-отписки';
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
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const role = currentUser?.role;
  const items = role ? NAV.filter((n) => n.roles.includes(role)) : NAV;

  return (
    <>
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
        <div className="mz-logo">
          <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={118} height={53} priority />
          <div className="mz-logo__os">
            Sprint OS
            <span>1 четверть · 2026</span>
          </div>
        </div>

        <div className="mz-header__right">
          <div className="mz-header__week">
            <small>Спринт</small>
            <b className="mz-num">Неделя {selectedWeekNumber} / 10</b>
          </div>

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
              <div className="mz-user__ava">{currentUser?.fullName?.charAt(0) || '?'}</div>
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
                    <div className="mz-tag" style={{ marginBottom: 0 }}>Войти как</div>
                    <button
                      type="button"
                      className="mz-link"
                      onClick={() => setUserMenuOpen(false)}
                      style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-soft)' }}
                    >
                      ✕ Закрыть
                    </button>
                  </div>
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
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mz-shell">
      {/* Левая рейка (desktop) — как .left-bar лендинга */}
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

      {/* Нижняя панель (mobile) — transient-posture: большие цели касания */}
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
