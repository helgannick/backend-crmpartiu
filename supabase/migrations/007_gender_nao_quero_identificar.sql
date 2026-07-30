-- ============================================================
-- 007_gender_nao_quero_identificar.sql
-- Permite gravar 'Nao Quero Identificar' (com til no "a") em clients.gender
-- Created: 2026-07-30
--
-- O cadastro publico (/register) oferece a opcao "Nao Quero Identificar".
-- Antes desta migration o valor era gravado como 'Outro', porque o CHECK
-- de 001_create_tables.sql so aceitava Masculino | Feminino | Outro.
--
-- 'Outro' continua permitido: registros antigos nao sao reescritos e as
-- telas autenticadas podem seguir usando o valor.
--
-- Arquivo mantido 100% ASCII de proposito: colar SQL com caractere
-- multi-byte no SQL Editor do Supabase truncou a string e gerou
-- "unterminated quoted string". O literal usa o escape Unicode do
-- Postgres em string E'': \u00E3 e o codigo do "a" com til. Resolve para
-- exatamente os mesmos bytes UTF-8 (C3 A3, forma precomposta NFC) que o
-- frontend envia em src/app/register/page.tsx.
-- ============================================================

DO $$
DECLARE
  con_name TEXT;
BEGIN
  -- O CHECK de 001_create_tables.sql e inline (sem nome explicito), entao o
  -- Postgres o nomeia automaticamente (clients_gender_check). Remove qualquer
  -- CHECK de gender existente pelo nome real -- inclusive o desta propria
  -- migration, o que a torna idempotente em reexecucoes.
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
  CHECK (gender IN ('Masculino', 'Feminino', 'Outro', E'N\u00E3o Quero Identificar'));
