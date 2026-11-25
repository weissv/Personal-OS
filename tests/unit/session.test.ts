import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'unit-test-session-secret-0123456789';
const { createSessionToken, verifySessionToken, passwordFingerprint, getSessionCookieOptions } = await import(
  '../../src/lib/session.ts'
);
const { hashPassword, verifyPassword, generatePassword } = await import('../../src/lib/password.ts');

describe('Сессии (HMAC)', () => {
  test('выпущенный токен проверяется и несёт payload', () => {
    const t = createSessionToken({ u: 'user-1', p: 'fp' });
    const p = verifySessionToken(t);
    assert.equal(p?.u, 'user-1');
    assert.equal(p?.p, 'fp');
  });

  test('подделанный payload отвергается', () => {
    const t = createSessionToken({ u: 'student' });
    const [, sig] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'admin', e: Date.now() + 1e9 })).toString('base64url');
    assert.equal(verifySessionToken(`${forged}.${sig}`), null);
  });

  test('просроченный токен отвергается', () => {
    const t = createSessionToken({ u: 'x' }, Date.now() - 400 * 24 * 3600 * 1000);
    assert.equal(verifySessionToken(t), null);
  });

  test('мусор и слишком длинные строки отвергаются', () => {
    for (const bad of ['', 'abc', '.sig', 'a'.repeat(5000), null, undefined]) assert.equal(verifySessionToken(bad), null);
  });

  test('отпечаток пароля меняется вместе с паролем (отзыв сессий)', () => {
    const h1 = hashPassword('first-password');
    const h2 = hashPassword('second-password');
    assert.notEqual(passwordFingerprint(h1), passwordFingerprint(h2));
    assert.equal(passwordFingerprint(h1), passwordFingerprint(h1));
    assert.ok(!passwordFingerprint(h1).includes(h1.slice(0, 8)), 'хэш не утекает в отпечаток');
  });

  test('secure-флаг cookie следует протоколу запроса за прокси', () => {
    const https = new Request('http://internal/x', { headers: { 'x-forwarded-proto': 'https' } });
    const http = new Request('http://localhost:3000/x');
    assert.equal(getSessionCookieOptions(https).secure, true);
    assert.equal(getSessionCookieOptions(http).secure, false);
    assert.equal(getSessionCookieOptions(http).httpOnly, true);
  });
});

describe('Пароли (scrypt)', () => {
  test('верный пароль проходит, неверный — нет', () => {
    const h = hashPassword('correct horse');
    assert.equal(verifyPassword('correct horse', h), true);
    assert.equal(verifyPassword('wrong horse', h), false);
    assert.equal(verifyPassword('x', null), false);
    assert.equal(verifyPassword('x', 'broken-format'), false);
  });

  test('соль уникальна для каждого хэша', () => {
    assert.notEqual(hashPassword('same'), hashPassword('same'));
  });

  test('генератор: нужная длина, без похожих символов', () => {
    const p = generatePassword(16);
    assert.equal(p.length, 16);
    assert.doesNotMatch(p, /[0O1lI]/);
  });
});
