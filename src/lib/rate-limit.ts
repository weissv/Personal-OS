/**
 * MEZON SPRINT OS - SLIDING WINDOW RATE LIMITER WITH IPV6 SUBNETTING
 *
 * Implements in-memory sliding window rate limiting.
 * Includes IPv6 subnet masking (/64) to prevent rotational brute-force attacks
 * across massive IPv6 pools.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);

  // Периодическая очистка, чтобы Map не росла бесконечно
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * Нормализует IP-адрес:
 * - IPv4 возвращается как есть.
 * - IPv6 маскируется до подсети /64 (первые 4 блока), что предотвращает
 *   обход лимитов через перебор адресов внутри выделенного диапазона.
 */
export function sourceNetwork(rawIp: string): string {
  const ip = (rawIp || '').trim().toLowerCase();
  if (!ip || ip === 'unknown') return 'unknown';

  if (!ip.includes(':')) {
    // IPv4 address
    return ip;
  }

  // Очистка от портов и квадратных скобок: e.g. [2001:db8::1]:8080
  const clean = ip.replace(/^\[/, '').replace(/\](?::\d+)?$/, '');
  const parts = clean.split(':');
  if (parts.length >= 4) {
    return `${parts.slice(0, 4).join(':')}::/64`;
  }
  return `${clean}::/64`;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  const raw = fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
  return sourceNetwork(raw);
}
