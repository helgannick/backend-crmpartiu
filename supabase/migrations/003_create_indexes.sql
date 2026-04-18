-- ============================================================
-- 003_create_indexes.sql
-- Índices para queries frequentes do CRM
-- Created: 2026-04-18
-- Executar APÓS 001_create_tables.sql
-- ============================================================

-- Busca por email (login, dedup)
CREATE INDEX IF NOT EXISTS idx_clients_email
  ON clients(email);

-- Busca e agrupamento por cidade (dashboard)
CREATE INDEX IF NOT EXISTS idx_clients_city
  ON clients(city);

-- Filtro de aniversariantes por mês
CREATE INDEX IF NOT EXISTS idx_clients_birth_date
  ON clients(birth_date);

-- Ordenação e filtro por data de criação (dashboard, recentes)
CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON clients(created_at DESC);

-- Filtro por status (dashboard ativo/inativo) — apenas se coluna existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
  END IF;
END $$;

-- JOIN interactions → clients (listagem e contagem)
CREATE INDEX IF NOT EXISTS idx_interactions_client_id
  ON interactions(client_id);

-- Ordenação de interações por data
CREATE INDEX IF NOT EXISTS idx_interactions_created_at
  ON interactions(created_at DESC);

-- JOIN client_music_genres → client
CREATE INDEX IF NOT EXISTS idx_cmg_client_id
  ON client_music_genres(client_id);

-- JOIN client_events → client
CREATE INDEX IF NOT EXISTS idx_ce_client_id
  ON client_events(client_id);
