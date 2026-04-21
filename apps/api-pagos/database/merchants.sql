-- Merchants and POS devices for POS Blokko integration

CREATE TABLE IF NOT EXISTS merchants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  kyb_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (kyb_status IN ('PENDING', 'VERIFIED', 'SUSPENDED')),
  callback_url VARCHAR(500),
  api_key_hash VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_devices (
  id VARCHAR(50) PRIMARY KEY,
  merchant_id VARCHAR(50) NOT NULL REFERENCES merchants(id),
  label VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX idx_merchants_wallet ON merchants(wallet_address);
CREATE INDEX idx_pos_devices_merchant ON pos_devices(merchant_id);
