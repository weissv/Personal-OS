/**
 * Клиентский доступ к API Sprint OS — единая точка для всех экранов.
 *
 * Основной канал авторизации — httpOnly cookie. Токен дополнительно хранится
 * в localStorage как резервный канал (Bearer) для окружений, где cookie
 * не доходят (встроенные webview, прокси-превью). Медиа (<img>/<audio>)
 * получают токен в query — сервер принимает его только на роуте файлов.
 */

const TOKEN_KEY = 'mezon_auth_token';
const LEGACY_USER_KEY = 'mezon_auth_user';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null | undefined) {
  if (!token) return;
  try {
    storage()?.setItem(TOKEN_KEY, token);
    storage()?.removeItem(LEGACY_USER_KEY); // профиль больше не кэшируется на клиенте
  } catch {
    // приватный режим / квота — cookie остаётся основным каналом
  }
}

export function clearAuthToken() {
  try {
    storage()?.removeItem(TOKEN_KEY);
    storage()?.removeItem(LEGACY_USER_KEY);
  } catch {
    // ignore
  }
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Сообщение для пользователя (по-русски), если ok = false. */
  error: string | null;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

const NETWORK_ERROR = 'Нет связи с сервером. Проверьте интернет и повторите.';

export async function apiFetch<T = unknown>(url: string, opts: ApiOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR };
  }

  const data = (await res.json().catch(() => null)) as (T & { error?: string; token?: string }) | null;
  // Сервер перевыпускает токен (скользящая сессия, смена пароля, имперсонация)
  if (res.ok && data && typeof data.token === 'string') setAuthToken(data.token);

  if (!res.ok) {
    const fallback =
      res.status === 401
        ? 'Сессия истекла — войдите снова.'
        : res.status === 403
          ? 'Недостаточно прав для этого действия.'
          : res.status === 429
            ? 'Слишком много запросов. Подождите немного.'
            : res.status >= 500
              ? 'Сервер временно недоступен. Повторите попытку.'
              : 'Не удалось выполнить действие.';
    return { ok: false, status: res.status, data, error: data?.error || fallback };
  }
  return { ok: true, status: res.status, data, error: null };
}

/** PUT бинарного файла (загрузка медиа) с теми же правилами авторизации. */
export async function apiUpload(url: string, blob: Blob, contentType: string): Promise<ApiResult<unknown>> {
  const headers: Record<string, string> = { 'Content-Type': contentType };
  const token = getAuthToken();
  // Заголовок Authorization — только для нашего сервера, не для внешнего S3
  const sameOrigin = url.startsWith('/');
  if (token && sameOrigin) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(url, { method: 'PUT', headers, body: blob, credentials: sameOrigin ? 'same-origin' : 'omit' });
    const data = await res.json().catch(() => null);
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? null : (data as { error?: string } | null)?.error || `Загрузка не удалась (${res.status})`,
    };
  } catch {
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR };
  }
}

const LOCAL_MEDIA_PATH = '/api/v1/media/files/';

/**
 * URL медиа-артефакта для <img>/<audio>/<a>. Для локального хранилища —
 * относительный путь (+ токен), внешние (S3/R2) URL возвращаются как есть.
 */
export function mediaUrl(rawUrl: string, download = false): string {
  if (!rawUrl) return '';
  const idx = rawUrl.indexOf(LOCAL_MEDIA_PATH);
  if (idx === -1) return rawUrl;
  const path = rawUrl.slice(idx).split('?')[0];
  const params = new URLSearchParams();
  const token = getAuthToken();
  if (token) params.set('token', token);
  if (download) params.set('download', 'true');
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
