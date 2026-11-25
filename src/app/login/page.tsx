'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, User, ExternalLink, Eye, EyeOff, Loader2, Sun, Moon, RotateCw, ShieldCheck } from 'lucide-react';
import { apiFetch, setAuthToken } from '@/lib/api-client';
import './login.css';

const BOOKENDS = [
  { icon: <Sun size={18} />, time: '07:30', title: 'Утро', text: 'Интенция и результат для каждого урока — за 90 секунд.' },
  { icon: <Moon size={18} />, time: '16:45', title: 'Вечер', text: 'Что готово, что переносим — одним решением.' },
  { icon: <RotateCw size={18} />, time: 'Вс', title: 'Ретро', text: 'Три честных вопроса и план на новую неделю.' },
];

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Сессия уже активна — сразу в дневник
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await apiFetch<{ user: unknown }>('/api/v1/auth/me');
      if (active && res.ok && res.data?.user) router.replace('/');
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const cleanLogin = login.trim();
    if (!cleanLogin || !password) {
      setError('Введите логин и пароль.');
      return;
    }

    setError(null);
    setIsLoading(true);
    const res = await apiFetch<{ token: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: { login: cleanLogin, password },
    });

    if (!res.ok || !res.data) {
      setError(res.error || 'Не удалось войти. Проверьте логин и пароль.');
      setIsLoading(false);
      return;
    }
    setAuthToken(res.data.token);
    router.replace('/');
  };

  const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="mz-login-page">
      <header className="mz-login-strip">
        <div className="mz-login-strip__inner">
          <span className="mz-login-strip__tagline">Mezon Inspiring School · Ташкент</span>
          <a href="https://mezon.uz/" target="_blank" rel="noopener noreferrer" className="mz-login-strip__link">
            mezon.uz <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main className="mz-login-main">
        <div className="mz-login-split">
          {/* История дня: о чём этот продукт — за 5 секунд чтения */}
          <section className="mz-login-story" aria-label="О Sprint OS">
            <div className="mz-login-story__square" aria-hidden="true" />
            <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={152} height={68} priority className="mz-login-story__logo" />
            <div className="mz-login-kicker">Sprint OS · 10 недель · PDCA</div>
            <h1 className="mz-login-title">
              Ежедневник, который <span className="mz-login-title__highlight">ведёшь ты</span>
            </h1>
            <p className="mz-login-subtitle">
              Твои цели, твои решения, твой ритм. Утром — намерения, вечером — итог, в воскресенье — честный взгляд на неделю.
            </p>

            <ol className="mz-login-steps">
              {BOOKENDS.map((b) => (
                <li key={b.title}>
                  <span className="mz-login-steps__icon" aria-hidden="true">
                    {b.icon}
                  </span>
                  <span>
                    <b>
                      {b.title} <small>{b.time}</small>
                    </b>
                    {b.text}
                  </span>
                </li>
              ))}
            </ol>

            <blockquote className="mz-login-quote">
              «Образование — это не подготовка к жизни; образование — это сама жизнь.»
              <cite>Джон Дьюи</cite>
            </blockquote>

            <Image src="/brand/fiz.png" alt="" width={230} height={255} className="mz-login-story__mascot" aria-hidden="true" />
          </section>

          {/* Форма входа */}
          <section className="mz-login-card" aria-labelledby="login-heading">
            <div className="mz-login-card__accent" aria-hidden="true" />
            <h2 id="login-heading" className="mz-login-card__title">
              Вход
            </h2>
            <p className="mz-login-card__lead">Логин и пароль выдаёт куратор или администратор школы.</p>

            {error && (
              <div ref={errorRef} tabIndex={-1} role="alert" className="mz-login-error">
                <span aria-hidden="true">✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mz-login-field">
                <label htmlFor="login-input" className="mz-login-label">
                  Логин или email
                </label>
                <div className="mz-login-input-wrap">
                  <User size={16} className="mz-login-input-icon" aria-hidden="true" />
                  <input
                    id="login-input"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="например, aziz.karimov"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    className="mz-login-input"
                    aria-invalid={!!error && !login.trim()}
                  />
                </div>
              </div>

              <div className="mz-login-field">
                <label htmlFor="password-input" className="mz-login-label">
                  Пароль
                </label>
                <div className="mz-login-input-wrap">
                  <Lock size={16} className="mz-login-input-icon" aria-hidden="true" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={detectCaps}
                    onKeyDown={detectCaps}
                    onBlur={() => setCapsLock(false)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="mz-login-input mz-login-input--password"
                    aria-describedby={capsLock ? 'caps-hint' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    aria-pressed={showPassword}
                    className="mz-login-toggle-pw"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {capsLock && (
                  <p id="caps-hint" className="mz-login-hint mz-login-hint--warn">
                    Включён Caps Lock
                  </p>
                )}
              </div>

              <button type="submit" disabled={isLoading} className="mz-login-submit" aria-busy={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mz-spin" aria-hidden="true" />
                    <span>Вхожу…</span>
                  </>
                ) : (
                  <>
                    <span>Войти</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <p className="mz-login-hint">
              Забыли пароль? Куратор класса или администратор школы выдаст новый — старые сессии при этом завершатся.
            </p>

            <div className="mz-login-footer">
              <ShieldCheck size={14} aria-hidden="true" />
              <span>Записи видят только ты, твой куратор и семья — в пределах доступа, который выбираешь ты.</span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
