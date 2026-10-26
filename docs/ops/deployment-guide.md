# Operational Runbook: Coolify & Docker Deployment

## 1. Production Architecture Overview
- **Platform:** Coolify / Docker Compose.
- **Port:** 3000 (Next.js Standalone).
- **Domain:** `https://diary.mezon.uz` (with automatic Let's Encrypt SSL).
- **Database:** PostgreSQL 17/18 cluster with persistent volume `pgdata`.
- **Media Uploads:** Persistent volume `uploads_data` mapped to `/app/public/uploads` (or Cloudflare R2).

## 2. Environment Variables Checklist
```env
DATABASE_URL="postgresql://postgres:<password>@db:5432/mezon_sprint_os?schema=public"
JWT_SECRET="<generate with openssl rand -base64 32>"
NEXT_PUBLIC_APP_URL="https://diary.mezon.uz"
ADMIN_EMAIL="somi@mezon.uz"
ADMIN_USERNAME="somi"
ADMIN_INITIAL_PASSWORD="<strong initial password>"
USE_REAL_S3="false" # set to true if using Cloudflare R2
SEED_ON_START="true"
```

## 3. Container Startup Lifecycle (`docker-entrypoint.sh`)
1. Prisma runs `db push --accept-data-loss --skip-generate` to ensure schema parity.
2. Invariant I3 trigger is verified via `node scripts/apply-invariants.js`.
3. Founder Godmode user is ensured via `node scripts/ensure-admin.js`.
4. Standalone Next.js server launches on port 3000.
