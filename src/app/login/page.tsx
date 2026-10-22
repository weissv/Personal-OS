'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Ошибка авторизации. Проверьте логин и пароль.');
        setIsLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Не удалось подключиться к серверу авторизации.');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#121212',
        color: '#ffffff',
        fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Top ecosystem strip */}
      <header
        style={{
          background: '#0a0a0a',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: '#fcd5a6',
                color: '#121212',
                padding: '2px 8px',
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              PRODUCTION
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Mezon Inspiring School · «Образование — это сама жизнь»
            </span>
          </div>
          <a
            href="https://mezon.uz/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#57a7b3',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            mezon.uz <ExternalLink size={12} />
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Logo & School Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Image
                src="/brand/logo.png"
                alt="Mezon Inspiring School"
                width={150}
                height={68}
                priority
                style={{ height: 'auto', maxWidth: '100%' }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '2.5px',
                textTransform: 'uppercase',
                color: '#a04a84',
                marginBottom: 6,
              }}
            >
              Sprint OS · Production Terminal
            </div>
            <h1
              style={{
                fontSize: 'clamp(22px, 5vw, 26px)',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.5px',
                lineHeight: 1.25,
              }}
            >
              Вход в{' '}
              <span
                style={{
                  background: '#00859e',
                  padding: '2px 8px',
                  color: '#ffffff',
                  display: 'inline-block',
                }}
              >
                Sprint OS
              </span>
            </h1>
            <p
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 13,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              Личная операционная система ученика и пульт наставника
            </p>
          </div>

          {/* Login Card */}
          <div
            style={{
              background: '#1c1c1c',
              border: '2px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
              padding: 'clamp(20px, 5vw, 32px)',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {/* Top accent line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #a04a84, #00859e, #fcd5a6)',
              }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  background: 'rgba(192, 57, 43, 0.18)',
                  border: '1px solid #c0392b',
                  color: '#ff7675',
                  padding: '12px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontWeight: 900 }}>✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="login-input"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#fcd5a6',
                    marginBottom: 8,
                  }}
                >
                  Логин или Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="login-input"
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="Логин или email"
                    autoComplete="username"
                    autoFocus
                    style={{
                      width: '100%',
                      background: '#121212',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      padding: '12px 14px 12px 42px',
                      color: '#ffffff',
                      fontSize: 16, // prevents iOS zoom
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#00859e')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <label
                    htmlFor="password-input"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: '#fcd5a6',
                    }}
                  >
                    Пароль
                  </label>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    Mezon Secure ID
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.4)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      background: '#121212',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      padding: '12px 42px 12px 42px',
                      color: '#ffffff',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#00859e')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  background: '#00859e',
                  color: '#ffffff',
                  border: 'none',
                  padding: '14px 20px',
                  fontWeight: 800,
                  fontSize: 14,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  opacity: isLoading ? 0.75 : 1,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#009bb8')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#00859e')}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
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
          <div
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <ShieldCheck size={14} color="#00859e" />
            <span>Коммерческий релиз Mezon Sprint OS · Контроль субъектности и траекторий</span>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
