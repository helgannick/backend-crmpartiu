-- ============================================================
-- 005_add_soft_delete.sql
-- Adiciona soft delete em clients e interactions
-- Created: 2026-04-18
-- ============================================================

ALTER TABLE clients      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at      ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_interactions_deleted_at ON interactions(deleted_at);
