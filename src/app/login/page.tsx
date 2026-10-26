'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Если сессия уже активна — мгновенно перенаправляем в дневник
  useEffect(() => {
    let active = true;
    const checkExistingSession = async () => {
      try {
        let token: string | null = null;
        if (typeof window !== 'undefined') {
          try {
            token = localStorage.getItem('mezon_auth_token');
          } catch {}
        }
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/v1/auth/me', { headers });
        if (res.ok && active) {
          const json = await res.json();
          if (json?.user) {
            router.replace('/');
          }
        }
      } catch {}
    };
    checkExistingSession();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Poka-Yoke debouncing

    const cleanLogin = login.trim();
    if (!cleanLogin || !password) {
      setError('Пожалуйста, введите логин и пароль.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: cleanLogin, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Ошибка авторизации. Проверьте логин и пароль.');
        setIsLoading(false);
        return;
      }

      // Сохраняем надёжный токен в localStorage для резервной авторизации
      if (data.token && typeof window !== 'undefined') {
        try {
          localStorage.setItem('mezon_auth_token', data.token);
          localStorage.setItem('mezon_auth_user', JSON.stringify(data.user));
        } catch {}
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Не удалось подключиться к серверу авторизации. Проверьте сеть.');
      setIsLoading(false);
    }
  };

  return (
    <div className="mz-login-page">
      {/* Top ecosystem strip */}
      <header className="mz-login-strip">
        <div className="mz-login-strip__inner">
          <div className="mz-login-strip__left">
            <span className="mz-login-strip__badge">PRODUCTION</span>
            <span className="mz-login-strip__tagline">
              Mezon Inspiring School · «Образование — это сама жизнь»
            </span>
          </div>
          <a
            href="https://mezon.uz/"
            target="_blank"
            rel="noopener noreferrer"
            className="mz-login-strip__link"
          >
            mezon.uz <ExternalLink size={12} />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="mz-login-main">
        <div className="mz-login-container">
          {/* Logo & School Header */}
          <div className="mz-login-header">
            <div className="mz-login-logo">
              <Image
                src="/brand/logo.png"
                alt="Mezon Inspiring School"
                width={150}
                height={68}
                priority
                style={{ height: 'auto', maxWidth: '100%' }}
              />
            </div>
            <div className="mz-login-kicker">Sprint OS · Production Terminal</div>
            <h1 className="mz-login-title">
              Вход в <span className="mz-login-title__highlight">Sprint OS</span>
            </h1>
            <p className="mz-login-subtitle">
              Личная операционная система ученика и пульт наставника
            </p>
          </div>

          {/* Login Card */}
          <div className="mz-login-card">
            <div className="mz-login-card__accent" aria-hidden="true" />

            {error && (
              <div role="alert" className="mz-login-error" aria-live="assertive">
                <span aria-hidden="true" style={{ fontWeight: 900 }}>✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mz-login-field">
                <label htmlFor="login-input" className="mz-login-label">
                  Логин или Email
                </label>
                <div className="mz-login-input-wrap">
                  <User size={16} className="mz-login-input-icon" aria-hidden="true" />
                  <input
                    id="login-input"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="Логин или email"
                    autoComplete="username"
                    autoFocus
                    className="mz-login-input"
                    aria-required="true"
                  />
                </div>
              </div>

              <div className="mz-login-field">
                <div className="mz-login-label-row">
                  <label htmlFor="password-input" className="mz-login-label">
                    Пароль
                  </label>
                  <span className="mz-login-label-hint">Mezon Secure ID</span>
                </div>
                <div className="mz-login-input-wrap">
                  <Lock size={16} className="mz-login-input-icon" aria-hidden="true" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="mz-login-input mz-login-input--password"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    className="mz-login-toggle-pw"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mz-login-submit"
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mz-spinner" />
                    <span>Авторизация…</span>
                  </>
                ) : (
                  <>
                    <span>Войти в систему</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="mz-login-footer">
            <ShieldCheck size={14} color="var(--teal, #00859e)" />
            <span>Коммерческий релиз Mezon Sprint OS · Контроль субъектности и траекторий</span>
          </div>
        </div>
      </main>
    </div>
  );
}
