import crypto from 'crypto';

/**
 * Подписанная сессия (HMAC-SHA256). Токен = base64url(payload).base64url(signature).
 * Подделать токен, не зная секрета, невозможно. Cookie — httpOnly, JS его не читает.
 *
 * payload:
 *   u — id эффективного пользователя
 *   a — id администратора (режим имперсонации)
 *   p — отпечаток пароля «владельца» сессии (админа при имперсонации, иначе пользователя).
 *       Смена/сброс пароля меняет отпечаток → все ранее выданные сессии отзываются мгновенно.
 *   e — срок действия (ms)
 */
export const SESSION_COOKIE = 'mezon_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 дней (1 учебный год)

export interface SessionPayload {
  u: string;
  a?: string;
  p?: string;
  e: number;
}

/** Секреты, опубликованные в репозитории (README, .env.example, docker-compose) — в проде недопустимы. */
const PUBLIC_DEFAULT_SECRETS = new Set([
  'mezon-sprint-os-super-secret-jwt-key-2026',
  'mezon-super-secret-jwt-token-change-in-prod',
]);

let warnedAboutSecret = false;

function getSecret(): string {
  const explicit = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) {
    if (process.env.NODE_ENV === 'production' && PUBLIC_DEFAULT_SECRETS.has(explicit) && !warnedAboutSecret) {
      warnedAboutSecret = true;
      console.error(
        '[SECURITY] SESSION_SECRET/JWT_SECRET совпадает с публичным значением из репозитория. ' +
          'Любой может подделать сессию. Сгенерируйте новый секрет: openssl rand -hex 32'
      );
    }
    return explicit;
  }
  // Запасной вариант: производный от строки подключения к БД (в проде содержит пароль).
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

/** Короткий отпечаток хэша пароля. Сам хэш в токен не попадает. */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`pwd:${passwordHash ?? ''}`)
    .digest('base64url')
    .slice(0, 16);
}

export function createSessionToken(payload: Omit<SessionPayload, 'e'>, now: number = Date.now()): string {
  const full: SessionPayload = { ...payload, e: now + SESSION_MAX_AGE_SECONDS * 1000 };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null, now: number = Date.now()): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.u !== 'string' || typeof payload.e !== 'number') return null;
    if (payload.a !== undefined && typeof payload.a !== 'string') return null;
    if (payload.p !== undefined && typeof payload.p !== 'string') return null;
    if (payload.e < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Secure-флаг выставляется по фактическому протоколу запроса (учитывая прокси),
 * иначе браузер молча отбрасывает cookie на http-стендах и вход «не держится».
 */
function isSecureRequest(req?: Request | null): boolean {
  if (!req) return process.env.NODE_ENV === 'production';
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded) return forwarded.split(',')[0].trim() === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return process.env.NODE_ENV === 'production';
  }
}

export function getSessionCookieOptions(req?: Request | null) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureRequest(req),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  };
}

export function getClearedCookieOptions(req?: Request | null) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecureRequest(req),
    path: '/',
    maxAge: 0,
  };
}
