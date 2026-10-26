-- ====================================================================
-- MEZON SPRINT OS - DOMAIN INVARIANT I3: APPEND-ONLY IMMUTABLE AUDIT
-- ====================================================================
-- Any attempt to UPDATE, DELETE, or TRUNCATE records in "AuditLog"
-- will be rejected at the PostgreSQL storage engine level.
-- ====================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'INVARIANT_VIOLATION: "AuditLog" is strictly append-only. Mutation or deletion of audit entries is cryptographically forbidden.'
  USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_immutable ON "AuditLog";
CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON "AuditLog";
CREATE TRIGGER audit_log_no_truncate
BEFORE TRUNCATE ON "AuditLog"
EXECUTE FUNCTION prevent_audit_log_modification();
