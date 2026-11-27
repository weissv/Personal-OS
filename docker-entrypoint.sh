#!/bin/sh
set -e

echo "=========================================================="
echo " Starting MEZON SPRINT OS (Personal-OS) in production mode"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Synchronizing database schema with Prisma..."
  # Без --accept-data-loss: если новая схема удаляет колонки или таблицы, push откажется,
  # а не сотрёт данные молча. Такие изменения нужно применять осознанно, отдельной миграцией.
  ./node_modules/prisma/build/index.js db push --skip-generate || echo "Warning: Prisma db push did not apply the schema (possibly a destructive change). Continuing..."
  echo "==> Applying database domain invariants (I3: Immutable Audit)..."
  node scripts/apply-invariants.js || echo "WARNING: Invariant I3 (append-only audit) is NOT enforced — check database permissions."
  echo "==> Ensuring Somi Godmode account exists and is ready..."
  node scripts/ensure-admin.js &
fi

echo "==> Starting Next.js standalone server on port $PORT..."
exec node server.js
