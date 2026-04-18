-- ============================================================
-- 002_create_relationships.sql
-- Garante constraints e FKs (idempotente — usa IF NOT EXISTS)
-- Created: 2026-04-18
-- Executar APÓS 001_create_tables.sql
-- ============================================================

-- FK: clients.favorite_event_id → events.id
-- (já declarada no CREATE TABLE, mas garante nome explícito para facilitar DROP futura)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_clients_favorite_event'
      AND table_name = 'clients'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT fk_clients_favorite_event
      FOREIGN KEY (favorite_event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- FK: interactions.client_id → clients.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interactions_client'
      AND table_name = 'interactions'
  ) THEN
    ALTER TABLE interactions
      ADD CONSTRAINT fk_interactions_client
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: client_music_genres.client_id → clients.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cmg_client'
      AND table_name = 'client_music_genres'
  ) THEN
    ALTER TABLE client_music_genres
      ADD CONSTRAINT fk_cmg_client
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: client_music_genres.genre_id → music_genres.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cmg_genre'
      AND table_name = 'client_music_genres'
  ) THEN
    ALTER TABLE client_music_genres
      ADD CONSTRAINT fk_cmg_genre
      FOREIGN KEY (genre_id) REFERENCES music_genres(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: client_events.client_id → clients.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ce_client'
      AND table_name = 'client_events'
  ) THEN
    ALTER TABLE client_events
      ADD CONSTRAINT fk_ce_client
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK: client_events.event_id → events.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ce_event'
      AND table_name = 'client_events'
  ) THEN
    ALTER TABLE client_events
      ADD CONSTRAINT fk_ce_event
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
END $$;
