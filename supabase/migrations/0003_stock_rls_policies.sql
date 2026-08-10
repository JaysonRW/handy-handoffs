-- ===========================================================================
-- PMTMS STOCK MODULE — RLS + POLICIES (EXECUTAR 1 VEZ NO SUPABASE SQL EDITOR)
-- Objetivo: Resolver erros 403 Permission Denied silenciosos (INSERT/UPDATE).
-- Se já rodou antes, os IF NOT EXISTS / DROP POLICY garantem idempotência.
-- ===========================================================================

BEGIN;

-- -----------------------------------------------------------
-- 1. ATIVAR ROW LEVEL SECURITY (CASO AINDA NÃO ESTEJA ATIVO)
-- -----------------------------------------------------------
ALTER TABLE IF EXISTS public.stock_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stock_loans     ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------
-- 2. REMOVER POLICIES ANTIGAS DUPLICADAS (LIMPEZA)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "stock_items_all_auth"   ON public.stock_items;
DROP POLICY IF EXISTS "stock_moves_all_auth"   ON public.stock_movements;
DROP POLICY IF EXISTS "stock_loans_all_auth"   ON public.stock_loans;

-- -----------------------------------------------------------
-- 3. CRIAR POLICIES PERMISSIVAS — FULL CRUD P/ AUTENTICADOS
--   (Depois podemos refinar para multi-condomínio com building_id)
-- -----------------------------------------------------------
CREATE POLICY "stock_items_all_auth"
ON public.stock_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "stock_moves_all_auth"
ON public.stock_movements
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "stock_loans_all_auth"
ON public.stock_loans
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------
-- 4. DIAGNÓSTICO FINAL RÁPIDO (Postgres 12+ compatível)
-- Resultado esperado: 3 linhas (stock_items / stock_movements / stock_loans)
--   com coluna rls_enabled = TRUE e policies_count = 1 para cada uma.
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
JOIN pg_namespace ns
  ON ns.oid = tbl.relnamespace
LEFT JOIN (
  SELECT polrelid, COUNT(*) AS pol_count
    FROM pg_policy
   GROUP BY 1
) p ON p.polrelid = tbl.oid
WHERE ns.nspname = 'public'
  AND tbl.relname IN ('stock_items','stock_movements','stock_loans')
ORDER BY 1;

COMMIT;
