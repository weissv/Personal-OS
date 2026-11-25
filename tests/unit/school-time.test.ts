import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareSlots,
  formatCountdown,
  formatSchoolDate,
  plural,
  schoolClock,
  secondsUntilPhoneTurnIn,
  smartStudentView,
} from '../../src/lib/school-time.ts';

// Ташкент = UTC+5. 2026-11-23 — понедельник.
const tashkent = (iso: string) => Date.parse(`${iso}+05:00`);

describe('Часы школы (Ташкент)', () => {
  test('день недели считается по Ташкенту, а не по UTC', () => {
    // 23:30 воскресенья UTC = 04:30 понедельника в Ташкенте
    assert.equal(schoolClock(Date.parse('2026-11-22T23:30:00Z')).dayOfWeek, 1);
  });

  test('умная маршрутизация: утро до 13:00, вечер после, Сб — проект, Вс — ретро', () => {
    assert.equal(smartStudentView(tashkent('2026-11-23T07:40:00')).view, 'morning');
    assert.equal(smartStudentView(tashkent('2026-11-23T12:59:00')).view, 'morning');
    assert.equal(smartStudentView(tashkent('2026-11-23T13:00:00')).view, 'evening');
    assert.equal(smartStudentView(tashkent('2026-11-28T10:00:00')).view, 'saturday');
    assert.equal(smartStudentView(tashkent('2026-11-29T20:00:00')).view, 'retro');
  });

  test('обратный отсчёт до сдачи телефона в 08:00', () => {
    assert.equal(secondsUntilPhoneTurnIn(tashkent('2026-11-23T07:41:15')), 18 * 60 + 45);
    assert.equal(secondsUntilPhoneTurnIn(tashkent('2026-11-23T08:00:00')), 0);
    assert.equal(secondsUntilPhoneTurnIn(tashkent('2026-11-23T15:00:00')), 0);
    assert.equal(formatCountdown(18 * 60 + 45), '18:45');
  });

  test('дата дня не «съезжает» в западных часовых поясах', () => {
    assert.equal(formatSchoolDate('2026-11-23T00:00:00.000Z', { day: 'numeric' }), '23');
  });
});

describe('Мелочи интерфейса', () => {
  test('слоты сортируются по времени, без времени — в конце', () => {
    const slots = [
      { id: 'c', startTime: null, orderIndex: 100 },
      { id: 'b', startTime: '10:15', orderIndex: 3 },
      { id: 'a', startTime: '08:30', orderIndex: 1 },
      { id: 'e', startTime: '13:15', orderIndex: 100 },
    ];
    assert.deepEqual([...slots].sort(compareSlots).map((s) => s.id), ['a', 'b', 'e', 'c']);
  });

  test('русское склонение', () => {
    const f: [string, string, string] = ['решение', 'решения', 'решений'];
    assert.deepEqual([1, 2, 5, 11, 21, 22, 25, 111].map((n) => plural(n, f)), [
      'решение', 'решения', 'решений', 'решений', 'решение', 'решения', 'решений', 'решений',
    ]);
  });
});
