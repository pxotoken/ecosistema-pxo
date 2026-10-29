-- Migration 003 — reconciliation record for SPEI fundings that match no intent
-- Created 2026-09-04 alongside the deposit-matcher hardening (SL-016).
--
-- Before this, a funding that could not be tied to a deposit intent was
-- logged and dropped. Because the worker rescans the last 50 fundings every
-- tick, the same unmatched deposits were re-logged every 30 seconds forever
-- and no record survived a restart. Nine real MXN fundings totalling
-- 1,780,207.50 sat in that state.
--
-- One row per funding id. The worker upserts on each tick, so `first_seen_at`
-- records when we first could not place it and `last_seen_at` shows it is
-- still in the scan window.

CREATE TABLE IF NOT EXISTS unmatched_fundings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bitso_funding_id    TEXT NOT NULL UNIQUE,
  amount              NUMERIC(18, 2) NOT NULL,
  currency            TEXT NOT NULL,
  sender_clabe        TEXT,                     -- null when the funding carried none
  funding_created_at  TIMESTAMPTZ,              -- when Bitso says the money arrived

  reason              TEXT NOT NULL,
    -- clabe_missing            no sender_clabe in the funding details
    -- clabe_not_registered     no user holds that CLABE
    -- no_pending_intent        user found, but no PENDING intent predating the funding
    -- amount_mismatch          intent found, but its amount is not the funding's
    -- funding_predates_intent  only intents newer than the funding exist

  intent_id           UUID REFERENCES deposit_intents(id),  -- set for amount_mismatch
  expected_amount     NUMERIC(18, 2),                       -- intent.mxn_amount, ditto

  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ops closes a row out by hand once the money is accounted for.
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,

  CONSTRAINT unmatched_fundings_reason_check CHECK (reason IN (
    'clabe_missing',
    'clabe_not_registered',
    'no_pending_intent',
    'amount_mismatch',
    'funding_predates_intent'
  ))
);

-- The working query for ops: what is still open, newest money first.
CREATE INDEX IF NOT EXISTS unmatched_fundings_open_idx
  ON unmatched_fundings (funding_created_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS unmatched_fundings_reason_idx
  ON unmatched_fundings (reason);

CREATE INDEX IF NOT EXISTS unmatched_fundings_clabe_idx
  ON unmatched_fundings (sender_clabe);
