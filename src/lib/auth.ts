import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { ParentAccessLevel, Role, User } from '@prisma/client';
import prisma from './prisma';
import { SESSION_COOKIE, verifySessionToken } from './session';

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

export async function getSessionContext(tokenOrReq?: string | Request | null): Promise<SessionContext | null> {
  try {
    let token: string | undefined | null = null;

    if (typeof tokenOrReq === 'string') {
      token = tokenOrReq;
    } else if (tokenOrReq && 'headers' in tokenOrReq) {
      const authHeader = tokenOrReq.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      }
      if (!token && 'url' in tokenOrReq && typeof tokenOrReq.url === 'string') {
        try {
          const parsedUrl = new URL(tokenOrReq.url);
          const qToken = parsedUrl.searchParams.get('token');
          if (qToken) token = qToken.trim();
        } catch {}
      }
      if (!token) {
        const rawCookie = tokenOrReq.headers.get('cookie') || '';
        const match = rawCookie.match(/(?:^|;\s*)mezon_session=([^;]+)/);
        if (match) {
          token = decodeURIComponent(match[1]);
        }
      }
    }

    if (!token) {
      try {
        const headerList = await headers();
        const authHeader = headerList.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.slice(7).trim();
        }
        if (!token) {
          const rawCookie = headerList.get('cookie') || '';
          const match = rawCookie.match(/(?:^|;\s*)mezon_session=([^;]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      } catch {
        // fallback if outside header context
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE)?.value;
      } catch {
        // fallback
      }
    }

    const payload = verifySessionToken(token);
    if (!payload) return null;

    const user = await prisma.user.findUnique({ where: { id: payload.u } });
    if (!user || !user.isActive) return null;

    let realAdmin: SafeUser | null = null;
    if (payload.a && payload.a !== user.id) {
      const admin = await prisma.user.findUnique({ where: { id: payload.a } });
      // Имперсонация валидна только пока админ существует, активен и остаётся админом
      if (!admin || !admin.isActive || admin.role !== Role.ADMIN) return null;
      realAdmin = sanitizeUser(admin);
    }

    const safe = sanitizeUser(user);
    const actor = realAdmin ?? (user.role === Role.ADMIN ? safe : null);
    return { user: safe, realAdmin, actor, isImpersonating: !!realAdmin };
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (digest === 'HANGING_PROMISE_REJECTION' || digest === 'NEXT_PRERENDER_INTERRUPTED') {
      throw error;
    }
    console.error('Failed to resolve session:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  return (await getSessionContext())?.user ?? null;
}

export type AuthResult =
  | { ok: true; ctx: SessionContext }
  | { ok: false; response: NextResponse };

const unauthorized = () => NextResponse.json({ error: 'Требуется вход в систему' }, { status: 401 });
const forbidden = (msg = 'Недостаточно прав для этого действия') =>
  NextResponse.json({ error: msg }, { status: 403 });

export function handleApiError(route: string, error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  if (digest === 'HANGING_PROMISE_REJECTION' || digest === 'NEXT_PRERENDER_INTERRUPTED' || digest === 'DYNAMIC_SERVER_USAGE') {
    throw error;
  }
  console.error(`[${route}] Error:`, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/**
 * Единая точка проверки доступа в API.
 *  - roles: допустимые роли эффективного пользователя
 *  - admin: требуется действующий администратор (в т.ч. во время имперсонации)
 */
export async function authenticate(
  opts: { roles?: Role[]; admin?: boolean } = {},
  req?: Request | null
): Promise<AuthResult> {
  const ctx = await getSessionContext(req);
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
    const link = await prisma.parentStudentLink.findUnique({
      where: { studentId_parentId: { studentId, parentId: user.id } },
    });
    return !!link && link.accessLevel !== ParentAccessLevel.REVOKED;
  }

  if (user.role === Role.MENTOR) {
    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { gradeLevel: true, role: true } });
    if (!student || student.role !== Role.STUDENT) return false;
    return user.gradeLevel == null || user.gradeLevel === student.gradeLevel;
  }
  return false;
}

export const denyResponse = () => forbidden('Нет доступа к данным этого ученика');
export const notFoundResponse = (what = 'Не найдено') => NextResponse.json({ error: what }, { status: 404 });

/** Цепочка slot → day → week → sprint → student для проверки владельца. */
export async function studentIdForSlot(slotId: string): Promise<string | null> {
  const slot = await prisma.daySlot.findUnique({
    where: { id: slotId },
    select: { day: { select: { week: { select: { sprint: { select: { studentId: true } } } } } } },
  });
  return slot?.day.week.sprint.studentId ?? null;
}

export async function studentIdForDay(dayId: string): Promise<string | null> {
  const day = await prisma.day.findUnique({
    where: { id: dayId },
    select: { week: { select: { sprint: { select: { studentId: true } } } } },
  });
  return day?.week.sprint.studentId ?? null;
}

export async function studentIdForWeek(weekId: string): Promise<string | null> {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    select: { sprint: { select: { studentId: true } } },
  });
  return week?.sprint.studentId ?? null;
}
