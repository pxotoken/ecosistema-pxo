-- Binance Endpoints Monitoring Table
-- Stores metadata about each Binance endpoint for health monitoring

CREATE TABLE IF NOT EXISTS binance_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  url VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_tested TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial endpoints
INSERT INTO binance_endpoints (name, url, method) VALUES
  ('ping', '/api/binance/ping', 'GET'),
  ('price', '/api/binance/price', 'GET'),
  ('account', '/api/binance/account', 'GET'),
  ('order', '/api/binance/order', 'POST'),
  ('allOrders', '/api/binance/allOrders', 'GET')
ON CONFLICT (name) DO NOTHING;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_binance_endpoints_status ON binance_endpoints(status);
CREATE INDEX IF NOT EXISTS idx_binance_endpoints_last_tested ON binance_endpoints(last_tested);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_binance_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every change
DROP TRIGGER IF EXISTS trigger_update_binance_endpoints_updated_at ON binance_endpoints;
CREATE TRIGGER trigger_update_binance_endpoints_updated_at
  BEFORE UPDATE ON binance_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_binance_endpoints_updated_at();
