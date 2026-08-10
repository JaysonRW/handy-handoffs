-- =========================================================
--  PMTMS Stock — LIMPAR DADOS DE TESTE / SEED
--  Cole este bloco INTEIRO no Supabase SQL Editor e RUN.
--
--  O QUE FAZ:
--   1. (OPTIONAL PRÉ-VIEW) Mostra ANTES o que será apagado, para você conferir.
--   2. Apaga os 2 itens seed (Martelo PMTMS-0001 + Lâmpada LED PMTMS-0002)
--      e quaisquer outros itens de TESTE criados na migration.
--   3. Apaga TODOS os stock_movements e stock_loans associados.
--   4. (SAFETY) Preserva a ESTRUTURA das tabelas, constraints, RLS e seeds
--      BUILDINGS / USERS / TASKS / CHECKLIST — NÃO toca.
--   5. Roda em TRANSACTION (BEGIN / COMMIT) — se falhar nada apaga.
--
--   Obs.: você pode rodar quantas vezes quiser — sem efeito colateral
--   quando as tabelas já estiverem vazias (DELETE WHERE IN vazio = 0 rows).
-- =========================================================

-- =========================================================
--  (A) PASSO 1 — PRÉ-VIEW (confira antes de apagar!)
--  Você pode comentar a section (B) abaixo na 1a vez para
--  só VER o que vai apagar, depois habilita (B) e roda de novo.
-- =========================================================
SELECT 'WHAT WILL BE DELETED — stock_items' AS step,
       id, sku, name, category, qty_in_stock, active
  FROM public.stock_items
 WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
    OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002');

SELECT COUNT(*) AS related_movements_to_delete
  FROM public.stock_movements
 WHERE item_id IN (
   SELECT id FROM public.stock_items
    WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
       OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002')
 );

SELECT COUNT(*) AS related_loans_to_delete
  FROM public.stock_loans
 WHERE item_id IN (
   SELECT id FROM public.stock_items
    WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
       OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002')
 );

-- =========================================================
--  (B) PASSO 2 — APLICA LIMPEZA (BEGIN / COMMIT)
--  Habilite esta section após checar a pré-view.
-- =========================================================
BEGIN;

WITH target_items AS NOT MATERIALIZED (
  SELECT id
    FROM public.stock_items
   WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
      OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002')
)
DELETE FROM public.stock_loans
 WHERE item_id IN (SELECT id FROM target_items);

WITH target_items AS NOT MATERIALIZED (
  SELECT id
    FROM public.stock_items
   WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
      OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002')
)
DELETE FROM public.stock_movements
 WHERE item_id IN (SELECT id FROM target_items);

DELETE FROM public.stock_items
 WHERE sku IN ('PMTMS-0001', 'PMTMS-0002')
    OR qr_code_id IN ('QR-PMTMS-0001', 'QR-PMTMS-0002');

COMMIT;

-- =========================================================
--  (C) PASSO 3 — DIAGNÓSTICO PÓS-LIMPEZA
--  Retorna 3 contagens (tabela vazia = 0 0 0 esperado).
-- =========================================================
SELECT 'stock_items total'  AS metric, COUNT(*) AS cnt FROM public.stock_items     UNION ALL
SELECT 'stock_movements total', COUNT(*) FROM public.stock_movements                 UNION ALL
SELECT 'stock_loans total',     COUNT(*) FROM public.stock_loans;
