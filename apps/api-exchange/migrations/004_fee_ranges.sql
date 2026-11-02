-- Migration 004 — fee by range (concept + amount band + percentage)
-- Created 2026-11-02.
--
-- A scratchpad for stakeholders, NOT a live pricing input. Nothing reads this
-- table at runtime: no route applies these percentages to a transaction, and
-- none should until someone decides the semantics below. The point is to let
-- commercial people enter the scenarios they care about — "a 10% discount on
-- the exchange fee for buys between 1M and 5M PXO" — so those can be argued
-- about with concrete numbers instead of hypotheticals.
--
-- Deliberately undecided, and why there is no application logic yet:
--   - whether `percent` is a discount or a premium (the concept label carries
--     that meaning today, which is a convention, not a constraint)
--   - whether overlapping ranges are an error or deliberate layering
--   - what happens at a boundary when two ranges touch
-- Writing the application logic before those are settled would bake in a guess
-- about money.

CREATE TABLE IF NOT EXISTS fee_ranges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alphanumeric only, per the screen's input rule. Enforced here too so the
  -- constraint survives a caller that is not our form.
  concept     TEXT NOT NULL,

  -- What the band is counted in. A symbol from the tokens table, which holds
  -- both the on-chain tokens (PXO, USDC, USDT) and the fiat units (MXN, USD) —
  -- so "1M PXO" and "10k USD" are both expressible, and a range is never
  -- ambiguous about what it measures. Stored as the symbol rather than a FK
  -- because the tokens table has one row per token and this names a unit, not
  -- a specific contract on a specific chain.
  denomination TEXT NOT NULL,

  -- Inclusive lower bound, exclusive upper bound is the reading that avoids
  -- boundary overlap, but nothing enforces that interpretation yet — see the
  -- note above. NUMERIC(36, 18) matches pxo_amount elsewhere, so a range can
  -- be expressed in PXO without losing precision.
  amount_from NUMERIC(36, 18) NOT NULL,
  amount_to   NUMERIC(36, 18) NOT NULL,

  -- Whole percent as entered (10 means 10%), not a fraction. This differs from
  -- pricing_rules.spread_buy, which stores 0.03 for 3% — the two are not
  -- interchangeable, and that is worth knowing before anything consumes this.
  percent     NUMERIC(7, 4) NOT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fee_ranges_concept_alnum   CHECK (concept ~ '^[A-Za-z0-9]+$'),
  -- Same alphanumeric shape as a token symbol. Not a foreign key: a symbol
  -- withdrawn from `tokens` should not silently invalidate a saved scenario.
  CONSTRAINT fee_ranges_denom_shape     CHECK (denomination ~ '^[A-Za-z0-9]{1,16}$'),
  CONSTRAINT fee_ranges_concept_len     CHECK (char_length(concept) BETWEEN 1 AND 64),
  CONSTRAINT fee_ranges_amounts_ordered CHECK (amount_to > amount_from),
  CONSTRAINT fee_ranges_amounts_nonneg  CHECK (amount_from >= 0),
  -- Generous bounds: this is a sandbox, and a stakeholder may well want to try
  -- a 100% discount to see what it does. Negative is rejected because the sign
  -- belongs to the concept, not the number.
  CONSTRAINT fee_ranges_percent_range   CHECK (percent >= 0 AND percent <= 100)
);

-- The list is read per concept, ordered by band.
CREATE INDEX IF NOT EXISTS fee_ranges_concept_from_idx
  ON fee_ranges (concept, denomination, amount_from);

-- updated_at trigger (idempotent definition; may already exist from prior migrations).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fee_ranges_set_updated_at ON fee_ranges;
CREATE TRIGGER fee_ranges_set_updated_at
  BEFORE UPDATE ON fee_ranges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
