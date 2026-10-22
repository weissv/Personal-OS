'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Lock, User, Sparkles, ExternalLink, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка авторизации. Проверьте логин и пароль.');
        setIsLoading(false);
        return;
      }

      // Success: redirect to main app
      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Не удалось подключиться к серверу авторизации.');
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setLogin(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#121212', color: '#fff' }}>
      {/* Top ecosystem strip */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: '#fcd5a6', color: '#121212', padding: '2px 8px', fontWeight: 800, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>
              PROD GATEWAY
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>
              Mezon Inspiring School · «Образование — это сама жизнь»
            </span>
          </div>
          <a
            href="https://mezon.uz/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#57a7b3', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}
          >
            mezon.uz <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          {/* Logo & School Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Image src="/brand/logo.png" alt="Mezon Inspiring School" width={160} height={72} priority />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#a04a84', marginBottom: 6 }}>
              Sprint OS · Production Entry
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              Вход в <span style={{ background: '#00859e', padding: '2px 10px', color: '#fff' }}>Sprint OS</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              Единый терминал доступа: Основатель (Godmode), Ученики, Кураторы и Родители
            </p>
          </div>

          {/* Login Card */}
          <div
            style={{
              background: '#1c1c1c',
              border: '2px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              padding: 32,
              position: 'relative',
            }}
          >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #a04a84, #00859e, #fcd5a6)' }} />

            {error && (
              <div
                style={{
                  background: 'rgba(192, 57, 43, 0.15)',
                  border: '1px solid #c0392b',
                  color: '#ff7675',
                  padding: '12px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>✕</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fcd5a6', marginBottom: 8 }}>
                  Логин или Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    required
                    placeholder="somi или email@mezon.uz"
                    autoFocus
                    style={{
                      width: '100%',
                      background: '#121212',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      padding: '12px 14px 12px 42px',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#00859e')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fcd5a6' }}>
                    Пароль
                  </label>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    Mezon Secure ID
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      background: '#121212',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      padding: '12px 14px 12px 42px',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#00859e')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.2)')}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  background: '#00859e',
                  color: '#fff',
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
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#009bb8')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#00859e')}
              >
                {isLoading ? (
                  <span>Авторизация…</span>
                ) : (
                  <>
                    <span>Войти в систему</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick credentials picker */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={12} color="#fcd5a6" />
                <span>Быстрый выбор профиля</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('somi', 'Mezon13!')}
                  style={{
                    background: 'linear-gradient(90deg, rgba(160, 74, 132, 0.25), rgba(0, 133, 158, 0.25))',
                    border: '1px solid #a04a84',
                    padding: '8px 12px',
                    color: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={14} color="#fcd5a6" />
                    <strong>⚡ somi (Founder · GODMODE)</strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#fcd5a6', fontFamily: 'monospace' }}>Mezon13!</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('davron', 'Mezon13!')}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '6px 8px',
                      color: '#ddd',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Ученик (davron)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('curator', 'Mezon13!')}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '6px 8px',
                      color: '#ddd',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Куратор (curator)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('parent', 'Mezon13!')}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      padding: '6px 8px',
                      color: '#ddd',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    Родитель (parent)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#00859e" />
            <span>Коммерческий релиз Mezon Sprint OS · Контроль субъектности и траекторий</span>
          </div>
        </div>
      </main>
    </div>
  );
}
