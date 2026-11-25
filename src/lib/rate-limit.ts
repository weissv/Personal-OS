/**
 * MEZON SPRINT OS - SLIDING WINDOW RATE LIMITER WITH IPV6 SUBNETTING
 *
 * In-memory sliding window (на один процесс Node.js — для одного контейнера достаточно).
 * IPv6-адреса маскируются до /64, чтобы перебор адресов внутри выделенного провайдером
 * диапазона не обходил лимиты.
 */

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()) {
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);

  // Периодическая очистка, чтобы Map не росла бесконечно
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Разворачивает сокращённую запись IPv6 («::») в 8 групп. null — если адрес некорректен. */
function expandIPv6(ip: string): string[] | null {
  let addr = ip;
  // IPv4-хвост (::ffff:1.2.3.4) → две hex-группы
  const v4 = addr.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    addr = addr.slice(0, v4.index) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.replace(/^0+(?=.)/, ''));
}

/**
 * Нормализует IP-адрес:
 * - IPv4 (в т.ч. IPv4-mapped IPv6 «::ffff:1.2.3.4») возвращается как IPv4;
 * - IPv6 маскируется до подсети /64 (первые 4 группы).
 */
export function sourceNetwork(rawIp: string): string {
  let ip = (rawIp || '').trim().toLowerCase();
  if (!ip || ip === 'unknown') return 'unknown';

  // [2001:db8::1]:8080 → 2001:db8::1 ; 1.2.3.4:5678 → 1.2.3.4
  ip = ip.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1');
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, '');
  ip = ip.replace(/%.*$/, ''); // zone id (fe80::1%eth0)

  if (!ip.includes(':')) return ip;

  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];

  const groups = expandIPv6(ip);
  if (!groups) return ip;
  return `${groups.slice(0, 4).join(':')}::/64`;
}

/**
 * IP клиента. За обратным прокси (Traefik/Coolify) X-Real-IP выставляет сам прокси,
 * а первый элемент X-Forwarded-For клиент может подделать — поэтому X-Real-IP приоритетнее.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip');
  const fwd = req.headers.get('x-forwarded-for');
  const raw = real?.trim() || (fwd ? fwd.split(',')[0].trim() : '') || '127.0.0.1';
  return sourceNetwork(raw);
}
