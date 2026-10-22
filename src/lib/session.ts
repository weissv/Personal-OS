import crypto from 'crypto';

/**
 * Подписанная сессия (HMAC-SHA256). Токен = base64url(payload).base64url(signature).
 * Подделать cookie, не зная секрета, невозможно. Cookie — httpOnly, JS его не читает.
 *
 * payload: { u: id эффективного пользователя, a?: id администратора (режим имперсонации), e: срок (ms) }
 */
export const SESSION_COOKIE = 'mezon_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 дней (1 учебный год)

export interface SessionPayload {
  u: string;
  a?: string;
  e: number;
}

function getSecret(): string {
  const explicit = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  // Запасной вариант: производный от секретной строки подключения к БД (в проде содержит пароль).
  const db = process.env.DATABASE_URL;
  if (db) return crypto.createHash('sha256').update(`mezon-session:${db}`).digest('hex');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not configured');
  }
  return 'dev-only-insecure-session-secret';
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(payload: Omit<SessionPayload, 'e'>): string {
  const full: SessionPayload = { ...payload, e: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.u !== 'string' || typeof payload.e !== 'number') return null;
    if (payload.e < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

export function getSessionCookieOptions() {
  return {
    ...sessionCookieOptions,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  };
}

export const clearedCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 0,
};
