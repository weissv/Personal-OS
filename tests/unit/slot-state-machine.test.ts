import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { SlotStatus } from '@prisma/client';
import { resolveTransitionPath, validateSlotTransition } from '../../src/lib/slot-state-machine.ts';
import { migrationTargetDayOfWeek, cleanMigrationTarget } from '../../src/lib/slot-migration.ts';

const { PENDING, DONE, MIGRATED, DROPPED } = SlotStatus;

describe('Poka-Yoke state machine', () => {
  test('PENDING может перейти в любой терминальный статус', () => {
    for (const s of [DONE, MIGRATED, DROPPED]) assert.equal(validateSlotTransition(PENDING, s).allowed, true);
  });

  test('терминальные статусы напрямую друг в друга не переходят', () => {
    const r = validateSlotTransition(DONE, MIGRATED);
    assert.equal(r.allowed, false);
    assert.match(r.reason ?? '', /POKA_YOKE_VIOLATION/);
    assert.equal(validateSlotTransition(DROPPED, DONE).allowed, false);
  });

  test('отмена решения (терминальный → PENDING) разрешена, повтор статуса — идемпотентен', () => {
    for (const s of [DONE, MIGRATED, DROPPED]) {
      assert.equal(validateSlotTransition(s, PENDING).allowed, true);
      assert.equal(validateSlotTransition(s, s).allowed, true);
    }
  });

  test('пересмотр в пакетном дебрифинге раскладывается в два легальных шага', () => {
    assert.deepEqual(resolveTransitionPath(DONE, MIGRATED), [PENDING, MIGRATED]);
    assert.deepEqual(resolveTransitionPath(PENDING, DONE), [DONE]);
    assert.deepEqual(resolveTransitionPath(DONE, DONE), []);
  });
});

describe('Перенос задачи', () => {
  test('«на завтра» — следующий день, «на субботу» — суббота', () => {
    assert.equal(migrationTargetDayOfWeek(1, 'tomorrow'), 2);
    assert.equal(migrationTargetDayOfWeek(5, 'tomorrow'), 6);
    assert.equal(migrationTargetDayOfWeek(3, 'saturday'), 6);
  });

  test('с субботы переносить внутри недели некуда (воскресенье — день ретро)', () => {
    assert.equal(migrationTargetDayOfWeek(6, 'tomorrow'), null);
    assert.equal(migrationTargetDayOfWeek(6, 'saturday'), null);
  });

  test('неизвестная цель переноса отбрасывается', () => {
    assert.equal(cleanMigrationTarget('nextweek'), null);
    assert.equal(cleanMigrationTarget('saturday'), 'saturday');
  });
});
