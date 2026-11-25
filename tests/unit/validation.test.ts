import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanEmail,
  cleanFileName,
  cleanGrade,
  cleanMediaType,
  cleanTime,
  cleanUsername,
  timeToMinutes,
} from '../../src/lib/validation.ts';

describe('Валидация на границе домена', () => {
  test('логин: латиница в нижнем регистре, 3–32 символа', () => {
    assert.equal(cleanUsername('  Aziz.Karimov '), 'aziz.karimov');
    assert.equal(cleanUsername('ab'), null);
    assert.equal(cleanUsername('азиз'), null);
  });

  test('email и класс', () => {
    assert.equal(cleanEmail(' A@Mezon.UZ '), 'a@mezon.uz');
    assert.equal(cleanEmail('no-at-sign'), null);
    assert.equal(cleanGrade('9'), 9);
    assert.equal(cleanGrade(12), null);
  });

  test('время ЧЧ:ММ', () => {
    assert.equal(cleanTime('08:30'), '08:30');
    assert.equal(cleanTime('24:00'), null);
    assert.equal(cleanTime('10:00 – 12:30'), null);
    assert.equal(timeToMinutes('13:15'), 795);
  });

  test('медиа: только белый список MIME, параметры кодека отбрасываются', () => {
    assert.equal(cleanMediaType('audio/webm;codecs=opus'), 'audio/webm');
    assert.equal(cleanMediaType('image/WEBP'), 'image/webp');
    assert.equal(cleanMediaType('text/html'), null);
    assert.equal(cleanMediaType('image/svg+xml'), null);
  });

  test('имя файла: без путей и управляющих символов', () => {
    assert.equal(cleanFileName('../../etc/passwd'), 'passwd');
    assert.equal(cleanFileName('C:\\fake\\"evil"<x>.webp'), 'evilx.webp');
    assert.equal(cleanFileName(''), null);
  });
});
