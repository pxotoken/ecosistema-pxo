-- Migration 006 — investment types (the Investments catalogue)
-- Created 2026-11-24.
--
-- The fixed-term certificate built in migration 005 is one product. There will
-- be several, so the catalogue gets its own table and the Investments screen
-- renders one card per active row.
--
-- WHERE THE RATE LIVES IS NOT SETTLED. This table carries a headline
-- `apy_percent` for the card, and `maturity_terms.baseline_annual_yield_percent`
-- carries a rate per term. Today the certificate snapshots the TERM's rate —
-- that is what the user picked in the dropdown and what is locked in — and this
-- column is display only. If the two disagree, a user sees one number on the
-- card and another in the dropdown. Nothing here resolves that; it is a CFO
-- call (see also the fee-by-range bands, which were meant to adjust yield by
-- amount). Whatever is decided, only one of them can be the number that pays.
--
-- Also open: terms are global today, not per investment type. A product that
-- needs its own tenors needs a join table, not a second copy of maturity_terms.

CREATE TABLE IF NOT EXISTS investment_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stable identifier, and the URL segment: /dashboard/investments/<name>.
  -- Constrained to a slug so a display-name edit can never break a link, and
  -- so the value cannot need URL-escaping.
  name          TEXT NOT NULL,

  -- What the cards and the product screen title show. Free text: this is the
  -- commercial name and it will be edited.
  display_name  TEXT NOT NULL,

  -- Annualized percent as entered: 5.49 means 5.49% APY. Same convention as
  -- maturity_terms and fee_ranges, NOT pricing_rules (which stores 0.03 for 3%).
  apy_percent   NUMERIC(7, 4) NOT NULL,

  -- Hides the card. Certificates already taken out are unaffected — they carry
  -- their own snapshot — so a product can be withdrawn from sale at any time.
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT investment_types_name_slug      CHECK (name ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT investment_types_name_len       CHECK (char_length(name) BETWEEN 1 AND 64),
  CONSTRAINT investment_types_display_len    CHECK (char_length(display_name) BETWEEN 1 AND 64),
  CONSTRAINT investment_types_apy_range      CHECK (apy_percent >= 0 AND apy_percent <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS investment_types_name_uidx ON investment_types (name);

-- Seed: the product that already exists. APY is a placeholder zero for the same
-- reason the maturity_terms rates are — there is no admin screen for this table
-- yet, and a card reading "0.00% APY" reads as unconfigured, where an invented
-- 7% would read as approved.
INSERT INTO investment_types (name, display_name, apy_percent)
VALUES ('cetes-cd', 'CETES', 0)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Certificates record which product they are
-- ---------------------------------------------------------------------------
-- Nullable: a certificate taken out before this migration has no type recorded,
-- and the backfill below is only correct because CETES is the only product that
-- has ever existed. Do not make this NOT NULL without checking that first.
ALTER TABLE pxo_cetes_cd
  ADD COLUMN IF NOT EXISTS investment_type_id UUID REFERENCES investment_types(id);

UPDATE pxo_cetes_cd
   SET investment_type_id = (SELECT id FROM investment_types WHERE name = 'cetes-cd')
 WHERE investment_type_id IS NULL;

CREATE INDEX IF NOT EXISTS pxo_cetes_cd_investment_type_idx
  ON pxo_cetes_cd (investment_type_id);

-- updated_at trigger (idempotent definition; may already exist from prior migrations).
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS investment_types_set_updated_at ON investment_types;
CREATE TRIGGER investment_types_set_updated_at
  BEFORE UPDATE ON investment_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
