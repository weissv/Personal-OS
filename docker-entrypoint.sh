#!/bin/sh
set -e

echo "=========================================================="
echo " Starting MEZON SPRINT OS (Personal-OS) in production mode"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Synchronizing database schema with Prisma..."
  ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate || echo "Warning: Prisma db push encountered an issue. Continuing..."
  echo "==> Ensuring Somi Godmode account exists and is ready..."
  node scripts/ensure-admin.js &
fi

echo "==> Starting Next.js standalone server on port $PORT..."
exec node server.js
