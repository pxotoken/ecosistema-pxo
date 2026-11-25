-- Migration 005 — fixed-term PXO certificates (CD) + their maturity terms
-- Created 2026-11-20.
--
-- Numbered 005 because 004 is taken by `fee_ranges`, merged to dev and main.
--
-- WHY THE LOCK IS OFF-CHAIN. The deployed PXO contract has no lock, stake or
-- vesting function, and its exact deployed source is unverified (SL-009), so a
-- contract change is not on the table for this. A CD is therefore: the user
-- transfers PXO to the treasury wallet, and this table is the record of the
-- obligation. Nothing on-chain enforces or proves the lock — the row is the
-- promise, and the UI says so. That makes these rows liabilities, not just
-- application state: a lost row is a user's principal with no claim on it.
--
-- Not decided here, deliberately, because each is a CFO call and writing the
-- arithmetic now would bake in a guess about money (see the fee_ranges
-- migration for the same reasoning):
--   - day-count convention for accrual (365 vs 360; CETES quotes 360)
--   - whether `baseline_annual_yield_percent` is the final rate or a baseline
--     that fee-by-range bands adjust by amount
--   - whether interest compounds on rollover, and whether rollover exists
--   - early-break policy: nothing here expresses one, so there is none
-- The maturity worker (task #3) is where those land. This migration only
-- records the term offered and the rate quoted at lock time.

-- ---------------------------------------------------------------------------
-- maturity_terms — the dropdown behind the lock form
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maturity_terms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What the user sees in the dropdown. Stored rather than derived from
  -- term_days so the wording is the CFO's, not a formatter's.
  label         TEXT NOT NULL,

  term_days     INTEGER NOT NULL,

  -- ANNUALIZED percent, as entered: 7.5 means 7.5% per year. This follows
  -- fee_ranges (10 = 10%) and NOT pricing_rules.spread_buy (0.03 = 3%). The
  -- three are not interchangeable. "annual" is in the column name because a
  -- rate on a 28-day term is ambiguous otherwise, and the ambiguity would be
  -- resolved differently by whoever read it next.
  baseline_annual_yield_percent NUMERIC(7, 4) NOT NULL,

  -- Hiding a term must not rewrite history: existing certificates keep their
  -- snapshot (see pxo_cetes_cd), so a term can be retired at any time.
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT maturity_terms_term_days_positive CHECK (term_days > 0),
  CONSTRAINT maturity_terms_label_len          CHECK (char_length(label) BETWEEN 1 AND 64),
  -- Negative yield is rejected: a CD that pays back less than principal is a
  -- different product and should not arrive through a typo in this column.
  CONSTRAINT maturity_terms_yield_range        CHECK (baseline_annual_yield_percent >= 0
                                                  AND baseline_annual_yield_percent <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS maturity_terms_term_days_uidx ON maturity_terms (term_days);

-- Seed: the four CETES tenors, since the certificate table is named after them.
-- RATES ARE PLACEHOLDER ZEROS ON PURPOSE. There is no admin screen for this
-- table yet, so the CFO sets them with an UPDATE; a zero shows up in the UI as
-- 0.00% per year, which reads as unconfigured. Inventing a plausible-looking
-- 7% here would read as approved.
INSERT INTO maturity_terms (label, term_days, baseline_annual_yield_percent)
VALUES
  ('28 days',  28,  0),
  ('91 days',  91,  0),
  ('182 days', 182, 0),
  ('364 days', 364, 0)
ON CONFLICT (term_days) DO NOTHING;

-- ---------------------------------------------------------------------------
-- pxo_cetes_cd — one row per certificate
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pxo_cetes_cd (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),

  -- What the user asked to lock, and what the treasury actually received.
  -- Two columns because they can legitimately differ: PXO's `transfer` deducts
  -- a fee (basisPointsRate / maximumFee) that any FEE_SETTER can switch on, in
  -- which case the treasury receives less than was sent. The certificate is
  -- worth what arrived, so principal_pxo is the credited figure and
  -- requested_pxo preserves the discrepancy instead of hiding it.
  requested_pxo   NUMERIC(36, 18) NOT NULL,
  principal_pxo   NUMERIC(36, 18),

  -- Snapshots, not just the FK. A certificate's term and rate are fixed at the
  -- moment it is taken out; editing maturity_terms afterwards must not silently
  -- reprice money a user already committed.
  term_id         UUID NOT NULL REFERENCES maturity_terms(id),
  term_days       INTEGER NOT NULL,
  annual_yield_percent NUMERIC(7, 4) NOT NULL,

  status          TEXT NOT NULL DEFAULT 'AWAITING_PXO',
                  -- AWAITING_PXO → ACTIVE → MATURED → PAID
                  --              ↘ FAILED (on-chain leg never verified)
                  -- CANCELLED is for an intent abandoned before funding.

  -- Explicit per certificate, never defaulted. A 364-day CD outlives whatever
  -- the ambient default was when it was created (SL-020).
  chain_id        INTEGER NOT NULL,

  -- Where the principal came from, and where maturity pays it back. Captured
  -- at confirm time rather than read from users.wallet_address later, because
  -- a user can change the wallet on their profile mid-term.
  user_address    TEXT,
  lock_tx_hash    TEXT,

  deposit_date    TIMESTAMPTZ,
  maturity_date   TIMESTAMPTZ,

  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pxo_cetes_cd_status_known CHECK (
    status IN ('AWAITING_PXO', 'ACTIVE', 'MATURED', 'PAID', 'FAILED', 'CANCELLED')
  ),
  CONSTRAINT pxo_cetes_cd_requested_positive CHECK (requested_pxo > 0),
  CONSTRAINT pxo_cetes_cd_principal_positive CHECK (principal_pxo IS NULL OR principal_pxo > 0),
  CONSTRAINT pxo_cetes_cd_term_days_positive CHECK (term_days > 0),
  -- A funded certificate must carry the facts the maturity worker needs. The
  -- worker will pay real PXO off these columns, so a half-populated ACTIVE row
  -- is rejected at write time rather than discovered at payout.
  CONSTRAINT pxo_cetes_cd_active_is_complete CHECK (
    status = 'AWAITING_PXO'
    OR status = 'CANCELLED'
    OR status = 'FAILED'
    OR (principal_pxo IS NOT NULL
        AND lock_tx_hash IS NOT NULL
        AND user_address IS NOT NULL
        AND deposit_date IS NOT NULL
        AND maturity_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS pxo_cetes_cd_user_idx ON pxo_cetes_cd (user_id, created_at DESC);

-- The daily maturity worker's query: everything ACTIVE whose maturity_date has
-- passed. Partial so the index stays small as PAID rows accumulate.
CREATE INDEX IF NOT EXISTS pxo_cetes_cd_due_idx
  ON pxo_cetes_cd (maturity_date)
  WHERE status = 'ACTIVE';

-- One certificate per funding transaction. This is the idempotency guarantee
-- for /confirm: a replayed call with the same hash cannot create or fund a
-- second certificate off one transfer.
CREATE UNIQUE INDEX IF NOT EXISTS pxo_cetes_cd_lock_tx_uidx
  ON pxo_cetes_cd (lock_tx_hash)
  WHERE lock_tx_hash IS NOT NULL;

-- updated_at trigger (idempotent definition; may already exist from prior migrations).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS maturity_terms_set_updated_at ON maturity_terms;
CREATE TRIGGER maturity_terms_set_updated_at
  BEFORE UPDATE ON maturity_terms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS pxo_cetes_cd_set_updated_at ON pxo_cetes_cd;
CREATE TRIGGER pxo_cetes_cd_set_updated_at
  BEFORE UPDATE ON pxo_cetes_cd
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
