import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, rateLimit, resetRateLimit, sourceNetwork } from '../../src/lib/rate-limit.ts';

describe('Нормализация IP', () => {
  test('IPv4 — как есть, порт отрезается', () => {
    assert.equal(sourceNetwork('203.0.113.7'), '203.0.113.7');
    assert.equal(sourceNetwork('203.0.113.7:5432'), '203.0.113.7');
  });

  test('IPv6 маскируется до /64 с учётом сокращения «::»', () => {
    assert.equal(sourceNetwork('2001:db8:aaaa:bbbb:1:2:3:4'), '2001:db8:aaaa:bbbb::/64');
    // соседние адреса одной /64 — одна сеть
    assert.equal(sourceNetwork('2001:db8::1'), sourceNetwork('2001:db8::ffff'));
    assert.equal(sourceNetwork('2001:db8::1'), '2001:db8:0:0::/64');
    assert.equal(sourceNetwork('[2001:db8::1]:8080'), '2001:db8:0:0::/64');
    assert.equal(sourceNetwork('2001:DB8:0000:0001::abcd'), '2001:db8:0:1::/64');
  });

  test('IPv4-mapped IPv6 сводится к IPv4', () => {
    assert.equal(sourceNetwork('::ffff:198.51.100.5'), '198.51.100.5');
  });

  test('пустое значение', () => {
    assert.equal(sourceNetwork(''), 'unknown');
  });

  test('X-Real-IP (выставляет прокси) приоритетнее подделываемого X-Forwarded-For', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '6.6.6.6, 10.0.0.1', 'x-real-ip': '198.51.100.9' } });
    assert.equal(clientIp(req), '198.51.100.9');
  });
});

describe('Скользящее окно', () => {
  test('лимит срабатывает и сбрасывается после окна', () => {
    const key = `t-${Math.random()}`;
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 1000, t0 + i).allowed, true);
    const blocked = rateLimit(key, 3, 1000, t0 + 10);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
    assert.equal(rateLimit(key, 3, 1000, t0 + 2000).allowed, true);
    resetRateLimit(key);
  });
});
