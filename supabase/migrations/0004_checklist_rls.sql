-- ===========================================================================
-- PMTMS — CHECKLIST MODULE (Caretaker Daily / Weekly checklist)
-- SQL: cria TABELAS se não existirem + ativa RLS + policies permissivas.
-- Idempotente: rodar quantas vezes quiser sem quebrar nada.
-- Você cola 1x no SQL Editor do Supabase (painel.supabase.com → SQL Editor).
-- ===========================================================================

BEGIN;

-- -----------------------------------------------------------
-- 1. CRIAR TABELAS (CASO AINDA NÃO EXISTAM NA SUA BASE)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL CHECK (char_length(title) <= 240),
  period_type     TEXT NOT NULL CHECK (period_type IN ('DAILY','WEEKLY','BIWEEKLY','MONTHLY')),
  period_rule     TEXT,
  building_id     TEXT NOT NULL DEFAULT 'MASTER',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id   TEXT
);

CREATE TABLE IF NOT EXISTS public.checklist_completions (
  item_id        TEXT NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  period_key     TEXT NOT NULL,
  checked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_by_id  TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_building_active_sort
  ON public.checklist_items (building_id, active, sort_order, title);

CREATE INDEX IF NOT EXISTS idx_checklist_completions_item_period
  ON public.checklist_completions (item_id, period_key);

-- -----------------------------------------------------------
-- 2. ATIVAR ROW LEVEL SECURITY
-- -----------------------------------------------------------
ALTER TABLE IF EXISTS public.checklist_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checklist_completions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 3. LIMPAR POLICIES ANTIGAS DUPLICADAS (idempotência)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "checklist_items_all_auth"          ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_completions_all_auth"    ON public.checklist_completions;

-- -----------------------------------------------------------
-- 4. POLICIES PERMISSIVAS (todos autenticados = full CRUD)
--    (Refinamos para multi-condomínio mais tarde se precisar)
-- -----------------------------------------------------------
CREATE POLICY "checklist_items_all_auth"
ON public.checklist_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "checklist_completions_all_auth"
ON public.checklist_completions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------
-- 5. DIAGNÓSTICO FINAL — resultado esperado 2 linhas:
--      table_name             | rls_enabled | policies_count
--      checklist_items        | t           | 1
--      checklist_completions  | t           | 1
-- -----------------------------------------------------------
SELECT
  tbl.relname                                          AS table_name,
  CASE WHEN tbl.relrowsecurity THEN TRUE ELSE FALSE END AS rls_enabled,
  COALESCE(p.pol_count, 0)                             AS policies_count,
  array_to_string(
    ARRAY(
      SELECT p2.polname
        FROM pg_policy p2
        JOIN pg_class c2 ON p2.polrelid = c2.oid
       WHERE c2.relname = tbl.relname
       ORDER BY 1
    ),
    ', '
  ) AS policies
FROM pg_class tbl
JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
LEFT JOIN (
  SELECT polrelid, COUNT(*) AS pol_count
    FROM pg_policy
   GROUP BY 1
) p ON p.polrelid = tbl.oid
WHERE ns.nspname = 'public'
  AND tbl.relname IN ('checklist_items','checklist_completions')
ORDER BY 1;

COMMIT;
