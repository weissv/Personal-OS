/**
 * MEZON SPRINT OS - DATABASE INVARIANTS APPLIER
 *
 * Invariant I3: append-only AuditLog (триггеры блокируют UPDATE, DELETE, TRUNCATE).
 *
 * PostgreSQL не принимает несколько команд в одном prepared statement, поэтому
 * SQL-файл делится на отдельные команды (с учётом $$-блоков тела функции)
 * и выполняется по одной в транзакции. Затем наличие триггеров проверяется.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const REQUIRED_TRIGGERS = ['audit_log_immutable', 'audit_log_no_truncate'];

/** Делит SQL на команды по «;», не разрезая dollar-quoted блоки и комментарии. */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let dollarTag = null;
  let i = 0;
  while (i < sql.length) {
    const rest = sql.slice(i);
    if (!dollarTag && rest.startsWith('--')) {
      const nl = rest.indexOf('\n');
      i += nl === -1 ? rest.length : nl + 1;
      continue;
    }
    const tag = rest.match(/^\$[A-Za-z0-9_]*\$/);
    if (tag) {
      if (!dollarTag) dollarTag = tag[0];
      else if (tag[0] === dollarTag) dollarTag = null;
      current += tag[0];
      i += tag[0].length;
      continue;
    }
    const ch = sql[i];
    if (ch === ';' && !dollarTag) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
    i++;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  console.log('Enforcing PostgreSQL Domain Invariants (I3: Immutable Append-Only Audit)...');
  const sqlPath = path.join(__dirname, '..', 'prisma', 'migrations', 'audit_append_only.sql');
  const statements = splitSqlStatements(fs.readFileSync(sqlPath, 'utf8'));

  await prisma.$transaction(async (tx) => {
    for (const stmt of statements) await tx.$executeRawUnsafe(stmt);
  });

  const rows = await prisma.$queryRawUnsafe(
    `SELECT tgname FROM pg_trigger WHERE tgname = ANY($1::text[])`,
    REQUIRED_TRIGGERS
  );
  const present = new Set(rows.map((r) => r.tgname));
  const missing = REQUIRED_TRIGGERS.filter((t) => !present.has(t));
  if (missing.length) throw new Error(`Triggers missing after apply: ${missing.join(', ')}`);

  REQUIRED_TRIGGERS.forEach((t) => console.log(`✓ PostgreSQL trigger "${t}" is active.`));
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('✗ Invariant I3 NOT enforced:', e.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { splitSqlStatements };
