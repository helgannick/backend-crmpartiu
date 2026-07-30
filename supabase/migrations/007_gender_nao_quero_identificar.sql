-- ============================================================
-- 007_gender_nao_quero_identificar.sql
-- Permite gravar 'Não Quero Identificar' em clients.gender
-- Created: 2026-07-30
--
-- O cadastro público (/register) oferece a opção "Não Quero Identificar".
-- Antes desta migration o valor era gravado como 'Outro', porque o CHECK
-- de 001_create_tables.sql só aceitava Masculino | Feminino | Outro.
--
-- 'Outro' continua permitido: registros antigos não são reescritos e as
-- telas autenticadas podem seguir usando o valor.
-- ============================================================

DO $$
DECLARE
  con_name TEXT;
BEGIN
  -- O CHECK de 001_create_tables.sql é inline (sem nome explícito), então o
  -- Postgres o nomeia automaticamente (clients_gender_check). Remove qualquer
  -- CHECK de gender existente pelo nome real — inclusive o desta própria
  -- migration, o que a torna idempotente em reexecuções.
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'clients'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%gender%'
  LOOP
    EXECUTE format('ALTER TABLE public.clients DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_gender_check
  CHECK (gender IN ('Masculino', 'Feminino', 'Outro', 'Não Quero Identificar'));
