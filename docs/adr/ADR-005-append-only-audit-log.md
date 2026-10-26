# ADR-005: PostgreSQL Trigger-Enforced Append-Only Audit Log

## Status
Accepted

## Context
Audit logging in administrative applications is frequently vulnerable to internal tampering. If an administrator account is compromised or misconfigured, audit logs could be modified or wiped to conceal malicious actions.

## Decision
We enforce Invariant I3 directly at the PostgreSQL storage engine level:
1. A trigger function `prevent_audit_log_modification()` raises an exception on any `UPDATE`, `DELETE`, or `TRUNCATE` against the `"AuditLog"` table.
2. In the application code (`src/lib/audit.ts`), only `create()` operations are permitted. No update or delete methods exist in the service layer.
3. Foreign key constraints on `"AuditLog"` are omitted intentionally so audit history survives account deletion.

## Consequences
- Impossible to alter history even from an interactive SQL prompt with application credentials.
- Total transparency and forensic reliability.
