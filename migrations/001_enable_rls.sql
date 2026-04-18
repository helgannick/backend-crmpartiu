-- ============================================================
-- 001_enable_rls.sql
-- Habilita Row Level Security em todas as tabelas do CRM
-- Aplicar no Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_genres         ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_music_genres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events        ENABLE ROW LEVEL SECURITY;
