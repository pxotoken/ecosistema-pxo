-- Migration 002 — SPEI deposit intents (buy PXO with MXN via Bitso)
-- Created 2026-07-12 for Iteration 2 of the fiat rework.
--
-- Replaces the Conekta pay-in model. Users register their source CLABE
-- (migration 000 users.CLABE + 002_clabe_unique_index) and send SPEI from
-- that account to our Bitso Business destination CLABE. The matching worker
-- ties incoming Bitso fundings back to the intent by sender_clabe.

CREATE TABLE IF NOT EXISTS deposit_intents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  mxn_amount            NUMERIC(18, 2)  NOT NULL,
  pxo_amount            NUMERIC(36, 18) NOT NULL,
  destination_clabe     TEXT NOT NULL,       -- snapshot of our Bitso Business CLABE
  source_clabe          TEXT NOT NULL,       -- snapshot of user's registered CLABE
  chain_id              INTEGER NOT NULL,
  user_address          TEXT NOT NULL,       -- destination wallet for issued PXO
  numeric_reference     TEXT,                -- optional 7-digit SPEI reference
  status                TEXT NOT NULL DEFAULT 'PENDING',
                        -- PENDING → MATCHED → COMPLETED | EXPIRED | FAILED
  bitso_funding_id      TEXT,                -- fid when a funding matches
  trading_order_id      UUID REFERENCES trading_orders(id),
  pxo_tx_hash           TEXT,                -- on-chain hash when PXO issued
  failure_reason        TEXT,
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User's intent list (most recent first for status polling).
CREATE INDEX IF NOT EXISTS deposit_intents_user_idx
  ON deposit_intents (user_id, created_at DESC);

-- Fast lookup for the matching worker: "any PENDING intent by source_clabe".
CREATE INDEX IF NOT EXISTS deposit_intents_pending_source_idx
  ON deposit_intents (source_clabe, created_at)
  WHERE status = 'PENDING';

-- Worker sweep for expiring stale intents.
CREATE INDEX IF NOT EXISTS deposit_intents_pending_expires_idx
  ON deposit_intents (expires_at)
  WHERE status = 'PENDING';

-- Idempotency: a single Bitso funding cannot be tied to two intents.
CREATE UNIQUE INDEX IF NOT EXISTS deposit_intents_bitso_fid_uidx
  ON deposit_intents (bitso_funding_id)
  WHERE bitso_funding_id IS NOT NULL;

-- updated_at trigger (idempotent definition; may already exist from prior migrations).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposit_intents_set_updated_at ON deposit_intents;
CREATE TRIGGER deposit_intents_set_updated_at
  BEFORE UPDATE ON deposit_intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
