-- ============================================================
-- 002_rls_policies.sql
-- Políticas RLS para todas as tabelas do CRM Partiu
-- Executar APÓS 001_enable_rls.sql
-- ============================================================


-- ============================================================
-- CLIENTS
-- Apenas usuários autenticados (staff/admin) operam a tabela
-- ============================================================

CREATE POLICY "Authenticated users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);


-- ============================================================
-- INTERACTIONS
-- ============================================================

CREATE POLICY "Authenticated users can view all interactions"
  ON interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert interactions"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update interactions"
  ON interactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete interactions"
  ON interactions FOR DELETE
  TO authenticated
  USING (true);


-- ============================================================
-- EVENTS
-- Leitura pública (usado no formulário de registro)
-- Escrita apenas por service role (via backend admin)
-- ============================================================

CREATE POLICY "Public can read events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================
-- MUSIC_GENRES
-- Leitura pública (usado no formulário de registro)
-- Escrita apenas por service role (via backend admin)
-- ============================================================

CREATE POLICY "Public can read music_genres"
  ON music_genres FOR SELECT
  TO anon, authenticated
  USING (true);


-- ============================================================
-- CLIENT_MUSIC_GENRES (tabela de junção)
-- ============================================================

CREATE POLICY "Authenticated users can view client_music_genres"
  ON client_music_genres FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client_music_genres"
  ON client_music_genres FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client_music_genres"
  ON client_music_genres FOR DELETE
  TO authenticated
  USING (true);


-- ============================================================
-- CLIENT_EVENTS (tabela de junção)
-- ============================================================

CREATE POLICY "Authenticated users can view client_events"
  ON client_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert client_events"
  ON client_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client_events"
  ON client_events FOR DELETE
  TO authenticated
  USING (true);
