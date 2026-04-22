-- ============================================================================
-- PXO Token — Initial schema
-- ============================================================================
-- Generated for a fresh Supabase project (ref: fraczjfaqjalvzexzcsp).
-- Inferred from monorepo code (apps/*, packages/shared).
-- Notes:
--   * No RLS — configure per table when security model is defined.
--   * `KYC_status` and `CLABE` kept case-sensitive (double-quoted) to match
--     how the code addresses them today. Everything else lowercased.
--   * Decimals use numeric(30,10) to cover crypto precision + fiat safely.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Shared helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- users — profile + auth + KYC consolidated columns (legacy mix)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id                        uuid primary key default gen_random_uuid(),
  provider_id               text unique,
  mail                      text unique,
  wallet_address            text unique,
  first_name                text,
  last_name                 text,
  profile_picture           text,
  country                   text,
  phone                     text,
  user_type                 text,
  "KYC_status"              text default 'PENDING',
  verificated               boolean default false,
  legal_identification      text,
  imagen_KYC                text,
  selfie_pictures           text[],
  identification_photos     text[],
  passport                  text,
  bank_name                 text,
  account_number            text,
  "CLABE"                   text,
  pin_hash                  text,
  risk_type                 text,
  role_type                 text,
  auth_provider             text,
  auth_provider_class       text,
  last_access               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists users_mail_idx            on users(mail);
create index if not exists users_wallet_address_idx  on users(wallet_address);
create index if not exists users_provider_id_idx     on users(provider_id);
create index if not exists users_kyc_status_idx      on users("KYC_status");

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- kyc_requests — legacy KYC workflow (pre manual-review implementation)
-- ---------------------------------------------------------------------------
create table if not exists kyc_requests (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references users(id) on delete cascade,
  first_name                 text,
  last_name                  text,
  email                      text,
  phone                      text,
  country                    text,
  legal_identification_type  text,   -- 'dni' | 'passport'
  identification_photos      text[],
  passport                   text,
  status                     text not null default 'PENDING', -- PENDING|VALIDATING|VALIDATED|REJECTED
  reviewed_by                uuid references users(id),
  rejection_reason           text,
  reviewed_at                timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index if not exists kyc_requests_user_id_idx on kyc_requests(user_id);
create index if not exists kyc_requests_status_idx  on kyc_requests(status);

drop trigger if exists kyc_requests_set_updated_at on kyc_requests;
create trigger kyc_requests_set_updated_at before update on kyc_requests
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- kyc_submissions — new manual-review audit trail (api-kyc)
-- ---------------------------------------------------------------------------
create table if not exists kyc_submissions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  status            text not null default 'pending_review',
  documents         jsonb not null default '[]'::jsonb,
  personal_info     jsonb,
  rejection_reason  text,
  provider          text,
  provider_ref      text,
  provider_status   text,
  reviewed_by       uuid references users(id),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists kyc_submissions_user_id_idx      on kyc_submissions(user_id);
create index if not exists kyc_submissions_status_idx       on kyc_submissions(status);
create index if not exists kyc_submissions_provider_ref_idx on kyc_submissions(provider_ref);

drop trigger if exists kyc_submissions_set_updated_at on kyc_submissions;
create trigger kyc_submissions_set_updated_at before update on kyc_submissions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- tokens — supported assets + PXO rates
-- ---------------------------------------------------------------------------
create table if not exists tokens (
  id              uuid primary key default gen_random_uuid(),
  symbol          text unique not null,
  name            text,
  address         text,
  decimals        int,
  pxo_buy_price   numeric(30,10),
  pxo_sell_price  numeric(30,10),
  pxo_commission  numeric(30,10),
  is_active       boolean default true,
  type            text default 'CRYPTO',
  icon_url        text,
  network_id      text,
  contract_uuid   uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tokens_symbol_idx on tokens(symbol);

drop trigger if exists tokens_set_updated_at on tokens;
create trigger tokens_set_updated_at before update on tokens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- transactions — on-chain ledger
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id                uuid primary key default gen_random_uuid(),
  destination_type  text,                     -- 'wallet' | 'contract'
  destination_uuid  uuid,
  from_type         text,                     -- 'user' | 'contract'
  from_uuid         uuid,
  tx_hash           text unique,
  amount            numeric(30,10),
  state             text,                     -- PENDIENTE | ...
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists transactions_tx_hash_idx on transactions(tx_hash);
create index if not exists transactions_state_idx   on transactions(state);

drop trigger if exists transactions_set_updated_at on transactions;
create trigger transactions_set_updated_at before update on transactions
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- trading_orders — buy/sell orders against PXO
-- ---------------------------------------------------------------------------
create table if not exists trading_orders (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references users(id) on delete restrict,
  order_type             text not null,                -- BUY | SELL
  currency_pair          text,
  base_amount            numeric(30,10),
  quote_amount           numeric(30,10),
  price                  numeric(30,10),
  status                 text not null default 'OPEN', -- OPEN|COMPLETED|CANCELLED|FAILED
  input_transaction_id   uuid references transactions(id) on delete set null,
  output_transaction_id  uuid references transactions(id) on delete set null,
  chain_id               int,
  completed_at           timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists trading_orders_user_id_idx on trading_orders(user_id);
create index if not exists trading_orders_status_idx  on trading_orders(status);

-- ---------------------------------------------------------------------------
-- gas_subsidies — tracking of gas reimbursed to user wallets
-- ---------------------------------------------------------------------------
create table if not exists gas_subsidies (
  id              uuid primary key default gen_random_uuid(),
  user_address    text,
  payment_amount  numeric(30,10),
  gas_amount      numeric(30,10),
  tx_hash         text,
  status          text not null default 'PENDING',   -- PENDING|COMPLETED|FAILED
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists gas_subsidies_user_address_idx on gas_subsidies(user_address);
create index if not exists gas_subsidies_status_idx       on gas_subsidies(status);

drop trigger if exists gas_subsidies_set_updated_at on gas_subsidies;
create trigger gas_subsidies_set_updated_at before update on gas_subsidies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- exchange_rates — history of rates used for quotes
-- ---------------------------------------------------------------------------
create table if not exists exchange_rates (
  id          uuid primary key default gen_random_uuid(),
  token_id    uuid references tokens(id) on delete cascade,
  buy_rate    numeric(30,10),
  sell_rate   numeric(30,10),
  is_active   boolean default true,
  timestamp   timestamptz not null default now()
);
create index if not exists exchange_rates_token_id_idx on exchange_rates(token_id);
create index if not exists exchange_rates_ts_idx       on exchange_rates(timestamp desc);

-- ---------------------------------------------------------------------------
-- api_logs — inbound/outbound API call audit
-- ---------------------------------------------------------------------------
create table if not exists api_logs (
  id          uuid primary key default gen_random_uuid(),
  provider    text,
  method      text,
  endpoint    text,
  status      int,
  response    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists api_logs_created_at_idx on api_logs(created_at desc);
create index if not exists api_logs_status_idx     on api_logs(status);

drop trigger if exists api_logs_set_updated_at on api_logs;
create trigger api_logs_set_updated_at before update on api_logs
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- binance_endpoints — health check registry
-- ---------------------------------------------------------------------------
create table if not exists binance_endpoints (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  url          text not null,
  method       text,
  status       text not null default 'ACTIVE',
  last_tested  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists binance_endpoints_set_updated_at on binance_endpoints;
create trigger binance_endpoints_set_updated_at before update on binance_endpoints
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- pricing_rules — admin-defined spreads per pair
-- ---------------------------------------------------------------------------
create table if not exists pricing_rules (
  id           uuid primary key default gen_random_uuid(),
  pair         text unique,
  spread_buy   numeric(30,10),
  spread_sell  numeric(30,10),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists pricing_rules_set_updated_at on pricing_rules;
create trigger pricing_rules_set_updated_at before update on pricing_rules
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- merchants — POS integration
-- ---------------------------------------------------------------------------
create table if not exists merchants (
  id              text primary key,
  name            text,
  wallet_address  text unique,
  kyb_status      text not null default 'PENDING',  -- PENDING|VERIFIED|SUSPENDED
  callback_url    text,
  api_key_hash    text,
  is_active       boolean default true,
  created_at      timestamptz not null default now()
);
create index if not exists merchants_wallet_idx on merchants(wallet_address);

-- ---------------------------------------------------------------------------
-- pos_devices — physical POS instances per merchant
-- ---------------------------------------------------------------------------
create table if not exists pos_devices (
  id            text primary key,
  merchant_id   text not null references merchants(id) on delete cascade,
  label         text,
  is_active     boolean default true,
  last_seen_at  timestamptz
);
create index if not exists pos_devices_merchant_idx on pos_devices(merchant_id);

-- ---------------------------------------------------------------------------
-- payments — merchant checkout payments
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  merchant_id      text references merchants(id) on delete restrict,
  pos_id           text references pos_devices(id) on delete set null,
  status           text not null default 'PENDING',  -- PENDING|CONFIRMED|EXPIRED|FAILED
  amount_mxn       numeric(20,4),
  amount_pxo       numeric(30,10),
  merchant_wallet  text,
  client_wallet    text,
  tx_hash          text unique,
  reference        text,
  chain_id         int,
  expires_at       timestamptz,
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists payments_merchant_idx on payments(merchant_id);
create index if not exists payments_status_idx   on payments(status);
create index if not exists payments_tx_hash_idx  on payments(tx_hash);
