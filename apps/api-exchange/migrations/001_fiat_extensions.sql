-- Migration 001 — fiat (MXN) on-ramp and off-ramp extensions
-- Created 2026-06-04 for the Conekta + Bitso fiat demo
-- Apply in Supabase: paste into SQL editor and run.

-- 1) Extend trading_orders with fiat-leg metadata
ALTER TABLE trading_orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,        -- 'conekta_bitso' (on-ramp) | 'bitso_spei' (off-ramp) | NULL (crypto-only)
  ADD COLUMN IF NOT EXISTS external_ref TEXT;          -- conekta order_id | bitso withdrawal id (wid)

-- 2) Extend transactions with a non-blockchain reference so fiat-initiated
--    entries (where tx_hash is null or distinct from the on-chain hash)
--    can still be uniquely identified for idempotency / reconciliation.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_ref TEXT;

-- 3) Webhook-idempotency guarantee. Conekta and Bitso both deliver webhooks
--    more than once; the unique index ensures the second insert errors out
--    and the handler returns 200 without double-processing.
CREATE UNIQUE INDEX IF NOT EXISTS trading_orders_payment_external_ref_uidx
  ON trading_orders (payment_method, external_ref)
  WHERE payment_method IS NOT NULL AND external_ref IS NOT NULL;

-- 4) Redemption intent — the off-ramp's state machine.
--    Created when the user submits a redeem-to-MXN form; lives until SPEI
--    is confirmed (or fails). Lets the frontend poll a stable id while the
--    multi-step orchestration runs.
CREATE TABLE IF NOT EXISTS redemption_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  pxo_amount            NUMERIC(36, 18) NOT NULL,
  mxn_amount            NUMERIC(18, 2)  NOT NULL,
  clabe                 TEXT NOT NULL,
  beneficiary_name      TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'AWAITING_PXO',
                        -- AWAITING_PXO → PXO_RECEIVED → SPEI_SENT → COMPLETED | FAILED
  trading_order_id      UUID REFERENCES trading_orders(id),
  bitso_withdrawal_id   TEXT,
  failure_reason        TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS redemption_intents_user_idx ON redemption_intents (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS redemption_intents_bitso_wid_uidx
  ON redemption_intents (bitso_withdrawal_id)
  WHERE bitso_withdrawal_id IS NOT NULL;

-- updated_at trigger (idempotent definition)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS redemption_intents_set_updated_at ON redemption_intents;
CREATE TRIGGER redemption_intents_set_updated_at
  BEFORE UPDATE ON redemption_intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
