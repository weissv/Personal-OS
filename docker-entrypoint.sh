#!/bin/sh
set -e

echo "=========================================================="
echo " Starting MEZON SPRINT OS (Personal-OS) in production mode"
echo "=========================================================="

if [ -n "$DATABASE_URL" ]; then
  echo "==> Synchronizing database schema with Prisma..."
  ./node_modules/prisma/build/index.js db push --skip-generate || echo "Warning: Prisma db push encountered an issue. Continuing..."
fi

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> SEED_ON_START is true. Running database seed..."
  node prisma/seed.js || echo "Warning: Seed failed or already completed."
fi

echo "==> Starting Next.js standalone server on port $PORT..."
exec node server.js
