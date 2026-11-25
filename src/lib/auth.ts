import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ParentAccessLevel, Prisma, Role, User } from '@prisma/client';
import prisma from './prisma';
import {
  SESSION_COOKIE,
  SessionPayload,
  createSessionToken,
  getSessionCookieOptions,
  passwordFingerprint,
  verifySessionToken,
} from './session';

export interface SafeUser {
  id: string;
  email: string;
  username: string | null;
  fullName: string;
  role: Role;
  gradeLevel: number | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Никогда не отдаём passwordHash наружу. */
export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    gradeLevel: user.gradeLevel,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function isUserGodmode(user: { role: Role } | null | undefined): boolean {
  return !!user && user.role === Role.ADMIN;
}

export interface SessionContext {
  /** Эффективный пользователь (при имперсонации — тот, кем «притворяется» админ). */
  user: SafeUser;
  /** Реальный администратор, если идёт имперсонация. */
  realAdmin: SafeUser | null;
  /** Администратор, который действует (реальный админ или сам пользователь-админ). */
  actor: SafeUser | null;
  isImpersonating: boolean;
}

interface ResolveOptions {
  /**
   * Разрешить токен в query-строке (?token=). Только для GET-медиа, которые грузятся
   * через <img>/<audio> и не могут передать заголовок Authorization.
   */
  allowQueryToken?: boolean;
}

const COOKIE_RE = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`);

function tokenFromCookieHeader(raw: string | null): string | null {
  const match = (raw || '').match(COOKIE_RE);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function tokenFromAuthHeader(raw: string | null): string | null {
  if (raw && raw.startsWith('Bearer ')) {
    const t = raw.slice(7).trim();
    return t || null;
  }
  return null;
}

async function extractTokens(source: string | Request | null | undefined, opts: ResolveOptions): Promise<string[]> {
  if (typeof source === 'string') return [source];
  const out: string[] = [];
  const push = (t: string | null | undefined) => {
    if (t && !out.includes(t)) out.push(t);
  };

  if (source) {
    // Порядок: httpOnly cookie → Authorization: Bearer → ?token= (если разрешено)
    push(tokenFromCookieHeader(source.headers.get('cookie')));
    push(tokenFromAuthHeader(source.headers.get('authorization')));
    if (opts.allowQueryToken) {
      try {
        push(new URL(source.url).searchParams.get('token')?.trim());
      } catch {
        // некорректный URL — игнорируем
      }
    }
    return out;
  }

  // Вызов без Request (серверные компоненты) — читаем из контекста запроса Next.js
  try {
    const cookieStore = await cookies();
    push(cookieStore.get(SESSION_COOKIE)?.value);
    const headerList = await headers();
    push(tokenFromAuthHeader(headerList.get('authorization')));
  } catch {
    // вне контекста запроса
  }
  return out;
}

function rethrowNextInternals(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  if (
    digest === 'HANGING_PROMISE_REJECTION' ||
    digest === 'NEXT_PRERENDER_INTERRUPTED' ||
    digest === 'DYNAMIC_SERVER_USAGE'
  ) {
    throw error;
  }
}

export async function getSessionContext(
  tokenOrReq?: string | Request | null,
  opts: ResolveOptions = {}
): Promise<SessionContext | null> {
  try {
    for (const token of await extractTokens(tokenOrReq, opts)) {
      const payload = verifySessionToken(token);
      if (!payload) continue;
      const ctx = await resolvePayload(payload);
      if (ctx) return ctx;
    }
    return null;
  } catch (error: unknown) {
    rethrowNextInternals(error);
    console.error('Failed to resolve session:', error);
    return null;
  }
}

async function resolvePayload(payload: SessionPayload): Promise<SessionContext | null> {
  const user = await prisma.user.findUnique({ where: { id: payload.u } });
  if (!user || !user.isActive) return null;

  let admin: User | null = null;
  if (payload.a && payload.a !== user.id) {
    admin = await prisma.user.findUnique({ where: { id: payload.a } });
    // Имперсонация валидна только пока админ существует, активен и остаётся админом
    if (!admin || !admin.isActive || admin.role !== Role.ADMIN) return null;
  }

  // Отзыв сессий при смене пароля владельца сессии.
  // Токены старого формата (без p) принимаются и перевыпускаются через /auth/me.
  const owner = admin ?? user;
  if (payload.p !== undefined && payload.p !== passwordFingerprint(owner.passwordHash)) {
    return null;
  }

  const safe = sanitizeUser(user);
  const realAdmin = admin ? sanitizeUser(admin) : null;
  const actor = realAdmin ?? (user.role === Role.ADMIN ? safe : null);
  return { user: safe, realAdmin, actor, isImpersonating: !!realAdmin };
}

/** Выпуск токена сессии с актуальным отпечатком пароля. */
export async function issueSessionToken(userId: string, adminId?: string | null): Promise<string> {
  const ownerId = adminId && adminId !== userId ? adminId : userId;
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { passwordHash: true } });
  const p = passwordFingerprint(owner?.passwordHash);
  return createSessionToken(adminId && adminId !== userId ? { u: userId, a: adminId, p } : { u: userId, p });
}

/** Ставит cookie сессии на ответ (secure — по протоколу запроса). */
export function attachSessionCookie(response: NextResponse, token: string, req?: Request | null) {
  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(req));
  return response;
}

export type AuthResult =
  | { ok: true; ctx: SessionContext }
  | { ok: false; response: NextResponse };

const unauthorized = () => NextResponse.json({ error: 'Требуется вход в систему' }, { status: 401 });
const forbidden = (msg = 'Недостаточно прав для этого действия') =>
  NextResponse.json({ error: msg }, { status: 403 });

export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

export function handleApiError(route: string, error: unknown, publicMessage = 'Внутренняя ошибка сервера') {
  rethrowNextInternals(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Запись не найдена или уже удалена' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Такая запись уже существует' }, { status: 409 });
    }
  }
  console.error(`[${route}] Error:`, error);
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}

/**
 * Единая точка проверки доступа в API.
 *  - roles: допустимые роли эффективного пользователя
 *  - admin: требуется действующий администратор (в т.ч. во время имперсонации)
 */
export async function authenticate(
  opts: { roles?: Role[]; admin?: boolean; allowQueryToken?: boolean } = {},
  req?: Request | null
): Promise<AuthResult> {
  const ctx = await getSessionContext(req, { allowQueryToken: opts.allowQueryToken });
  if (!ctx) return { ok: false, response: unauthorized() };

  if (opts.admin && !ctx.actor) return { ok: false, response: forbidden('Требуются права администратора') };
  if (opts.roles && !opts.roles.includes(ctx.user.role) && !(ctx.actor && opts.roles.includes(Role.ADMIN))) {
    return { ok: false, response: forbidden() };
  }
  return { ok: true, ctx };
}

/**
 * Может ли пользователь контекста читать/менять данные ученика.
 *  - STUDENT: только свои (чтение и запись)
 *  - PARENT: только привязанный ученик и только если доступ не отозван (чтение)
 *  - MENTOR: ученики своей параллели (или все, если параллель не задана) (чтение)
 *  - ADMIN: всё
 */
export async function canAccessStudent(
  ctx: SessionContext,
  studentId: string,
  mode: 'read' | 'write'
): Promise<boolean> {
  const { user } = ctx;
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.STUDENT) return user.id === studentId;
  if (mode === 'write') return false;

  if (user.role === Role.PARENT) {
    const level = await parentAccessLevelFor(user.id, studentId);
    return level !== ParentAccessLevel.REVOKED;
  }

  if (user.role === Role.MENTOR) {
    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { gradeLevel: true, role: true } });
    if (!student || student.role !== Role.STUDENT) return false;
    return user.gradeLevel == null || user.gradeLevel === student.gradeLevel;
  }
  return false;
}

/** Уровень доступа конкретного родителя к ученику (REVOKED, если связи нет). */
export async function parentAccessLevelFor(parentId: string, studentId: string): Promise<ParentAccessLevel> {
  const link = await prisma.parentStudentLink.findUnique({
    where: { studentId_parentId: { studentId, parentId } },
    select: { accessLevel: true },
  });
  return link?.accessLevel ?? ParentAccessLevel.REVOKED;
}

/**
 * Медиа-артефакты недели (фото конспектов, голосовые) — часть «полного» дневника.
 * Родителю со сводным доступом они не показываются (Invariant I2).
 */
export async function canAccessStudentMedia(ctx: SessionContext, studentId: string): Promise<boolean> {
  if (!(await canAccessStudent(ctx, studentId, 'read'))) return false;
  if (ctx.user.role !== Role.PARENT) return true;
  return (await parentAccessLevelFor(ctx.user.id, studentId)) === ParentAccessLevel.FULL_ACCESS;
}

export const denyResponse = () => forbidden('Нет доступа к данным этого ученика');
export const notFoundResponse = (what = 'Не найдено') => NextResponse.json({ error: what }, { status: 404 });

/** Цепочка slot → day → week → sprint → student для проверки владельца. */
export async function studentIdForSlot(slotId: string): Promise<string | null> {
  if (typeof slotId !== 'string' || !slotId) return null;
  const slot = await prisma.daySlot.findUnique({
    where: { id: slotId },
    select: { day: { select: { week: { select: { sprint: { select: { studentId: true } } } } } } },
  });
  return slot?.day.week.sprint.studentId ?? null;
}

export async function studentIdForDay(dayId: string): Promise<string | null> {
  if (typeof dayId !== 'string' || !dayId) return null;
  const day = await prisma.day.findUnique({
    where: { id: dayId },
    select: { week: { select: { sprint: { select: { studentId: true } } } } },
  });
  return day?.week.sprint.studentId ?? null;
}

export async function studentIdForWeek(weekId: string): Promise<string | null> {
  if (typeof weekId !== 'string' || !weekId) return null;
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    select: { sprint: { select: { studentId: true } } },
  });
  return week?.sprint.studentId ?? null;
}
