const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const ROLES = ['STUDENT', 'MENTOR', 'PARENT', 'ADMIN'] as const;
export const MIN_GRADE = 1;
export const MAX_GRADE = 11;

export function cleanUsername(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return USERNAME_RE.test(s) ? s : null;
}

export function cleanEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return s.length <= 120 && EMAIL_RE.test(s) ? s : null;
}

export function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, ' ');
  return s.length >= 2 && s.length <= 100 ? s : null;
}

export function cleanPassword(v: unknown): string | null {
  return typeof v === 'string' && v.length >= 8 && v.length <= 128 ? v : null;
}

export function cleanGrade(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= MIN_GRADE && n <= MAX_GRADE ? n : null;
}

export function cleanTime(v: unknown): string | null {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null;
}

export const PASSWORD_HINT = 'Пароль — не менее 8 символов';
export const USERNAME_HINT = 'Логин: 3–32 символа, латиница в нижнем регистре, цифры, точка, дефис, подчёркивание';
