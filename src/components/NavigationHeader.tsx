'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  KeyRound,
  X,
} from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

export type ViewMode = 'morning' | 'evening' | 'saturday' | 'retro' | 'mentor' | 'parent' | 'godmode';

export interface AppUser {
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
  currentUser: AppUser | null;
  isMobileDeviceFrame: boolean;
  onToggleDeviceFrame: () => void;
  selectedWeekNumber: number;
  weeksTotal: number;
  sprintTitle: string | null;
  showWeek: boolean;
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
  ADMIN: 'Администратор',
};

const NAV: Array<{ view: ViewMode; label: string; hint: string; icon: React.ReactNode; roles: string[] }> = [
  { view: 'godmode', label: 'Godmode', hint: 'школа', icon: <Sparkles size={22} />, roles: ['ADMIN'] },
  { view: 'morning', label: 'Утро', hint: '07:30', icon: <Sun size={22} />, roles: ['STUDENT'] },
  { view: 'evening', label: 'Вечер', hint: '16:45', icon: <Moon size={22} />, roles: ['STUDENT'] },
  { view: 'saturday', label: 'Сб', hint: 'проект', icon: <Hammer size={22} />, roles: ['STUDENT'] },
  { view: 'retro', label: 'Вс', hint: 'ретро', icon: <RotateCw size={22} />, roles: ['STUDENT'] },
  { view: 'mentor', label: 'Класс', hint: 'куратор', icon: <Compass size={22} />, roles: ['MENTOR'] },
  { view: 'parent', label: 'Неделя', hint: 'доверие', icon: <ShieldCheck size={22} />, roles: ['PARENT'] },
];

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentView,
  onViewChange,
  currentUser,
  isMobileDeviceFrame,
  onToggleDeviceFrame,
  selectedWeekNumber,
  weeksTotal,
  sprintTitle,
  showWeek,
  isGodmode = false,
  isImpersonating = false,
  onRevertToAdmin,
  onLogout,
  children,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Esc закрывает меню и возвращает фокус на кнопку профиля
  useEffect(() => {
    if (!userMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [userMenuOpen]);

  const role = currentUser?.role;
  let items = role ? NAV.filter((n) => n.roles.includes(role)) : [];
  // Администратор во время имперсонации видит экраны пользователя + возврат в Godmode
  if (isGodmode && !items.some((i) => i.view === 'godmode')) items = [NAV[0], ...items];

  const subtitle = sprintTitle?.replace(/\s*\(\d+ класс\)\s*$/, '') || 'Mezon Inspiring School';

  return (
    <>
      <a href="#main" className="mz-skip">
        Перейти к содержимому
      </a>

      {isImpersonating && (
        <div className="mz-impersonate-bar" role="status">
          <div className="mz-impersonate-bar__text">
            <Sparkles size={16} aria-hidden="true" />
            <span>
              Просмотр от лица <strong>{currentUser?.fullName}</strong> · {ROLE_LABEL[role || ''] || role}
              <span className="mz-impersonate-bar__note">. Все действия записываются в журнал от вашего имени.</span>
            </span>
          </div>
          <button type="button" onClick={onRevertToAdmin} className="mz-impersonate-bar__btn">
            ← Godmode
          </button>
        </div>
      )}

      <div className="mz-strip">
        <div className="mz-strip__inner">
          <div className="mz-strip__text">
            <span className="mz-chip mz-chip--peach">Экосистема Mezon</span>
            <span className="t">
              Sprint OS — продолжение школы <strong>Mezon Inspiring School</strong>: «Образование — это сама жизнь»
            </span>
          </div>
          <a className="site" href="https://mezon.uz/" target="_blank" rel="noopener noreferrer">
            mezon.uz <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
      </div>

      <header className="mz-header">
        {isGodmode ? (
          <button type="button" className="mz-logo mz-logo--button" onClick={() => onViewChange('godmode')} aria-label="Открыть Godmode">
            <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={118} height={53} priority />
            <span className="mz-logo__os">
              Sprint OS
              <span>{subtitle}</span>
            </span>
          </button>
        ) : (
          <div className="mz-logo">
            <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={118} height={53} priority />
            <div className="mz-logo__os">
              Sprint OS
              <span>{subtitle}</span>
            </div>
          </div>
        )}

        <div className="mz-header__right">
          {showWeek && (
            <div className="mz-header__week">
              <small>Спринт</small>
              <b className="mz-num">
                Неделя {selectedWeekNumber} / {weeksTotal}
              </b>
            </div>
          )}

          {isGodmode && currentView !== 'godmode' && (
            <button type="button" onClick={() => onViewChange('godmode')} className="mz-godmode-btn">
              <Sparkles size={14} aria-hidden="true" />
              <span>Godmode</span>
            </button>
          )}

          {/* Предпросмотр «как на телефоне ученика» — инструмент администратора */}
          {isGodmode && currentView !== 'godmode' && (
            <button
              type="button"
              className="mz-device"
              aria-pressed={isMobileDeviceFrame}
              onClick={onToggleDeviceFrame}
              title={isMobileDeviceFrame ? 'Вернуть полный экран' : 'Показать как на телефоне (390 px)'}
            >
              {isMobileDeviceFrame ? <Smartphone size={16} /> : <Monitor size={16} />}
              <span>{isMobileDeviceFrame ? '390 px' : 'Desktop'}</span>
            </button>
          )}

          <div className="mz-user-wrap">
            <button
              ref={menuButtonRef}
              type="button"
              className="mz-user"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className={`mz-user__ava ${role === 'ADMIN' ? 'mz-user__ava--admin' : ''}`} aria-hidden="true">
                {currentUser?.fullName?.charAt(0) || '?'}
              </span>
              <span className="mz-user__meta">
                <small>{(role && ROLE_LABEL[role]) || 'Гость'}</small>
                <b>{currentUser?.fullName || 'Загрузка…'}</b>
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div className="mz-backdrop" onClick={() => setUserMenuOpen(false)} aria-hidden="true" />
                <div className="mz-menu" role="menu" aria-label="Профиль">
                  <div className="mz-menu__head">
                    <div className="mz-menu__who">
                      <b>{currentUser?.fullName}</b>
                      <small>
                        {currentUser?.username ? `@${currentUser.username}` : currentUser?.email}
                        {currentUser?.gradeLevel ? ` · ${currentUser.gradeLevel} класс` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="mz-icon-btn"
                      onClick={() => setUserMenuOpen(false)}
                      aria-label="Закрыть меню"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {!isImpersonating && (
                    <button
                      type="button"
                      role="menuitem"
                      className="mz-menu__action"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setPasswordOpen(true);
                      }}
                    >
                      <KeyRound size={15} aria-hidden="true" />
                      <span>Сменить пароль</span>
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="mz-menu__action mz-menu__action--danger"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout?.();
                    }}
                  >
                    <LogOut size={15} aria-hidden="true" />
                    <span>Выйти из аккаунта</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mz-shell">
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
          <a className="mz-nav" href="https://mezon.uz/" target="_blank" rel="noopener noreferrer" title="Сайт школы Mezon">
            <ExternalLink size={20} />
            Школа
            <small>mezon.uz</small>
          </a>
        </nav>

        {children}
      </div>

      {items.length > 1 && (
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
      )}

      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    </>
  );
};
