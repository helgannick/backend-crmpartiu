-- ============================================================
-- 001_create_tables.sql
-- Cria todas as tabelas base do CRM Partiu
-- Created: 2026-04-18
-- Aplicar no Supabase SQL Editor em ordem numérica
-- ============================================================

-- Eventos (sem FK ainda — referenciado por clients)
CREATE TABLE IF NOT EXISTS events (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE
);

-- Gêneros musicais
CREATE TABLE IF NOT EXISTS music_genres (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  email               TEXT        UNIQUE NOT NULL,
  phone               TEXT,
  city                TEXT,
  gender              TEXT        CHECK (gender IN ('Masculino', 'Feminino', 'Outro')),
  birth_date          DATE,
  instagram           TEXT,
  lead_source         TEXT,
  bought_with_partiu  BOOLEAN     NOT NULL DEFAULT false,
  favorite_event_id   UUID        REFERENCES events(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'novo'
                                  CHECK (status IN ('novo', 'engajando', 'recorrente', 'vip')),
  contacted           BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interações com clientes
CREATE TABLE IF NOT EXISTS interactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relação N:N — cliente ↔ gêneros musicais
CREATE TABLE IF NOT EXISTS client_music_genres (
  client_id   UUID  NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  genre_id    UUID  NOT NULL REFERENCES music_genres(id)  ON DELETE CASCADE,
  PRIMARY KEY (client_id, genre_id)
);

-- Relação N:N — cliente ↔ eventos frequentados
CREATE TABLE IF NOT EXISTS client_events (
  client_id   UUID        NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
  event_id    UUID        NOT NULL REFERENCES events(id)   ON DELETE CASCADE,
  attended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (client_id, event_id)
);
