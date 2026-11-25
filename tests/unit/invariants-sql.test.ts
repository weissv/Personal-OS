import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { splitSqlStatements } = require('../../scripts/apply-invariants.js');

test('SQL инварианта I3 делится на отдельные команды, не разрезая тело функции', () => {
  const sql = fs.readFileSync(path.join(import.meta.dirname, '../../prisma/migrations/audit_append_only.sql'), 'utf8');
  const statements: string[] = splitSqlStatements(sql);
  assert.equal(statements.length, 5);
  assert.match(statements[0], /^CREATE OR REPLACE FUNCTION/);
  assert.match(statements[0], /RAISE EXCEPTION[\s\S]*END;\s*\$\$ LANGUAGE plpgsql$/);
  assert.ok(statements.some((s) => /BEFORE UPDATE OR DELETE ON "AuditLog"/.test(s)));
  assert.ok(statements.some((s) => /BEFORE TRUNCATE ON "AuditLog"/.test(s)));
});
