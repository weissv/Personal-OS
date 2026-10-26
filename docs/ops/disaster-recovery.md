# Operational Runbook: Disaster Recovery & Database Restoration

## 1. Automated Backups
Database backups run on a scheduled cron or via `./scripts/backup-db.sh`.
Each backup generates:
- `backups/mezon_sprint_os_YYYYMMDD_HHMMSS.sql.gz` (gzip compressed SQL dump)
- `backups/mezon_sprint_os_YYYYMMDD_HHMMSS.sql.gz.sha256` (integrity checksum)

Backups are retained for 14 days before automatic rotation.

## 2. Recovery Procedure

### Step 1: Locate Target Snapshot
List available snapshots:
```bash
ls -lh backups/
```

### Step 2: Validate Integrity
Before applying, ensure the SHA256 signature matches:
```bash
shasum -a 256 -c backups/mezon_sprint_os_YYYYMMDD_HHMMSS.sql.gz.sha256
```

### Step 3: Execute Restoration
Run the safe recovery script:
```bash
./scripts/restore-db.sh backups/mezon_sprint_os_YYYYMMDD_HHMMSS.sql.gz --force
```

### Step 4: Verify Post-Restore Health
Check service health:
```bash
curl -f http://localhost:3000/api/health
```
Ensure database invariants (I3 trigger) are re-asserted:
```bash
node scripts/apply-invariants.js
```
