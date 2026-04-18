-- ============================================================
-- 006_create_audit_log.sql
-- Tabela de audit log para rastrear INSERT/UPDATE/DELETE
-- Created: 2026-04-18
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT        NOT NULL,
  record_id   UUID        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values  JSONB,
  new_values  JSONB,
  user_id     UUID,
  user_email  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table   ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record  ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
