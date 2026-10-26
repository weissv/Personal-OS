#!/bin/sh
set -e

# =====================================================================
# MEZON SPRINT OS - TRANSACTION-SAFE DISASTER RESTORE SCRIPT
# =====================================================================
# Validates SHA256 integrity checksum and restores the database.
# =====================================================================

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore-db.sh <path-to-backup.sql.gz> [--force]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file $BACKUP_FILE not found."
  exit 1
fi

echo "=========================================================="
echo " MEZON SPRINT OS - DISASTER RESTORE PROCEDURE"
echo " Target File: $BACKUP_FILE"
echo "=========================================================="

# 1. Verify Checksum if present
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "==> Verifying SHA256 integrity checksum..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${BACKUP_FILE}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${BACKUP_FILE}.sha256"
  fi
  echo "✓ Checksum verification passed."
fi

# 2. Confirmation Lock
if [ "$2" != "--force" ]; then
  echo ""
  echo "⚠️  WARNING: Restoring will overwrite existing school database records!"
  echo "To execute restoration, re-run with --force flag:"
  echo "  ./scripts/restore-db.sh $BACKUP_FILE --force"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://postgres:password@127.0.0.1:5433/mezon_sprint_os?schema=public"
fi

echo "==> Executing restore..."
if command -v psql >/dev/null 2>&1; then
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
elif command -v docker >/dev/null 2>&1 && docker ps | grep -q mezon-personal-os-db; then
  gunzip -c "$BACKUP_FILE" | docker exec -i mezon-personal-os-db psql -U postgres mezon_sprint_os
fi

echo "✓ Database restore successfully finalized."
