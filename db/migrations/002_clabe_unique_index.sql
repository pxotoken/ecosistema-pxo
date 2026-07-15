-- Migration 002 — CLABE uniqueness across users
-- Created 2026-07-12 for the SPEI deposit flow (Iteration 1).
--
-- Adds a partial unique index on users."CLABE" so no two users can register
-- the same CLABE as their source bank account. Partial (WHERE ... IS NOT NULL)
-- means unregistered users (NULL) do not conflict with each other.
--
-- Postgres will raise error code 23505 (unique_violation) on conflict; the
-- api-users updateProfile handler translates this into HTTP 409 with a
-- generic message (no enumeration).

CREATE UNIQUE INDEX IF NOT EXISTS users_clabe_uidx
  ON users ("CLABE")
  WHERE "CLABE" IS NOT NULL;
