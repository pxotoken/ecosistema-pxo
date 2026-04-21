-- Payments table for POS Blokko integration
-- Network: Polygon Amoy Testnet (Chain ID 80002)

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR(50) NOT NULL REFERENCES merchants(id),
  pos_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'EXPIRED', 'FAILED')),
  amount_mxn NUMERIC(12, 2) NOT NULL,
  amount_pxo VARCHAR(78) NOT NULL,
  merchant_wallet VARCHAR(42) NOT NULL,
  client_wallet VARCHAR(42),
  tx_hash VARCHAR(66) UNIQUE,
  reference VARCHAR(100),
  chain_id INTEGER NOT NULL DEFAULT 56,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_merchant_id ON payments(merchant_id);
CREATE INDEX idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX idx_payments_expires_at ON payments(expires_at) WHERE status = 'PENDING';
