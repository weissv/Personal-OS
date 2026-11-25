import { SlotStatus, SlotType, ParentAccessLevel, Role } from '@prisma/client';

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  return typeof v === 'string' && TIME_RE.test(v.trim()) ? v.trim() : null;
}

export function cleanUuid(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return UUID_RE.test(s) ? s : null;
}

export function cleanText(v: unknown, maxLen = 5000, minLen = 0): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length < minLen) return null;
  return s.slice(0, maxLen);
}

export function cleanSlotStatus(v: unknown): SlotStatus | null {
  if (typeof v !== 'string') return null;
  const upper = v.trim().toUpperCase();
  return Object.values(SlotStatus).includes(upper as SlotStatus) ? (upper as SlotStatus) : null;
}

export function cleanSlotType(v: unknown): SlotType | null {
  if (typeof v !== 'string') return null;
  const upper = v.trim().toUpperCase();
  return Object.values(SlotType).includes(upper as SlotType) ? (upper as SlotType) : null;
}

export function cleanParentAccessLevel(v: unknown): ParentAccessLevel | null {
  if (typeof v !== 'string') return null;
  const upper = v.trim().toUpperCase();
  return Object.values(ParentAccessLevel).includes(upper as ParentAccessLevel)
    ? (upper as ParentAccessLevel)
    : null;
}

export function cleanRole(v: unknown): Role | null {
  if (typeof v !== 'string') return null;
  const upper = v.trim().toUpperCase();
  return Object.values(Role).includes(upper as Role) ? (upper as Role) : null;
}

export const PASSWORD_HINT = 'Пароль — не менее 8 символов';
export const USERNAME_HINT = 'Логин: 3–32 символа, латиница в нижнем регистре, цифры, точка, дефис, подчёркивание';

/* --------------------------------------------------------------------------
   Медиа-артефакты (фото конспектов и голосовые мысли)
   -------------------------------------------------------------------------- */

/** Белый список MIME-типов → расширение файла в хранилище. */
export const MEDIA_TYPES: Record<string, string> = {
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
};

/** Расширение → Content-Type при отдаче файла. */
export const MEDIA_CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(MEDIA_TYPES).map(([mime, ext]) => [ext, mime])
);

export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

/** 'audio/webm;codecs=opus' → 'audio/webm' (если тип разрешён). */
export function cleanMediaType(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const base = v.split(';')[0].trim().toLowerCase();
  return base in MEDIA_TYPES ? base : null;
}

/** Имя файла для отображения: без путей и управляющих символов. */
export function cleanFileName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const base = v.split(/[/\\]/).pop() || '';
  const s = base.replace(/[\u0000-\u001f\u007f"<>|]/g, '').trim().slice(0, 120);
  return s || null;
}

export function cleanDayOfWeek(v: unknown, max = 7): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

/** 'HH:MM' → минуты от полуночи. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
