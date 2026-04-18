-- ============================================================
-- 004_insert_seed_data.sql
-- Dados iniciais para novo ambiente
-- Created: 2026-04-18
-- Executar APÓS 001_create_tables.sql
-- ============================================================

-- Gêneros musicais padrão
INSERT INTO music_genres (name) VALUES
  ('Funk'),
  ('Sertanejo'),
  ('Pagode'),
  ('Eletrônico'),
  ('Rock'),
  ('MPB'),
  ('Forró'),
  ('Reggaeton'),
  ('Axé'),
  ('Trap'),
  ('Hip Hop'),
  ('R&B'),
  ('Pop'),
  ('Reggae'),
  ('Samba'),
  ('Gospel'),
  ('Jazz'),
  ('Blues'),
  ('Bossa Nova'),
  ('Indie')
ON CONFLICT (name) DO NOTHING;
