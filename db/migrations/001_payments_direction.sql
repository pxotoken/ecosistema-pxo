-- ============================================================================
-- 001 — payments.direction (PUSH | PULL)
-- ============================================================================
-- Habilita el flujo PULL (QR del cliente, cobro iniciado por el comercio)
-- conviviendo con el flujo PUSH actual (EIP-681).
--
-- Diseño:
--   * Una sola tabla `payments` para ambos flujos.
--   * `direction` distingue el ciclo de vida:
--       PUSH: cliente escanea QR del comercio y firma transfer(merchant, amount).
--       PULL: comercio escanea QR del cliente, postea intent, cliente firma.
--   * Estados PENDING|CONFIRMED|EXPIRED|FAILED se mantienen sin cambios.
--   * En PULL, el lapso "esperando firma del cliente" = PENDING + tx_hash NULL
--     con TTL corto (≤120s). Cuando el cliente firma, se reporta txHash y
--     el matching on-chain es igual al PUSH.
-- ============================================================================

alter table payments
  add column if not exists direction text not null default 'PUSH'
    check (direction in ('PUSH', 'PULL'));

-- Índice para la búsqueda en reconciliación PULL: matchear por (from, to, amount).
-- El flujo PUSH conserva su lookup por (merchant_wallet, amount, chain_id, status),
-- así que añadimos un índice específico para PULL.
create index if not exists payments_pull_lookup_idx
  on payments(direction, status, client_wallet, merchant_wallet, amount_pxo, chain_id);

-- Índice para la query de polling del cliente: GET /charges/pending?wallet=...
create index if not exists payments_pending_by_client_idx
  on payments(direction, status, client_wallet)
  where status = 'PENDING' and direction = 'PULL';
