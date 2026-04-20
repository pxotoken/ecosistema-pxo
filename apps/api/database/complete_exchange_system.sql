-- =====================================================
-- PXO EXCHANGE SYSTEM - COMPLETE DATABASE SCHEMA
-- =====================================================

-- 1. TOKENS TABLE
-- Stores token information and exchange rates
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(42) NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 6,
  pxo_buy_price DECIMAL(30,10) NOT NULL DEFAULT 1.12,
  pxo_sell_price DECIMAL(30,10) NOT NULL DEFAULT 1.12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TRANSACTIONS TABLE
-- Stores all blockchain transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_type VARCHAR(20) NOT NULL,
  destination_uuid UUID NOT NULL,
  from_type VARCHAR(20) NOT NULL,
  from_uuid UUID NOT NULL,
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  amount DECIMAL(30,10) NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TRADING_ORDERS TABLE
-- Stores buy/sell orders
CREATE TABLE IF NOT EXISTS public.trading_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  currency_pair VARCHAR(50) NOT NULL,
  base_amount DECIMAL(30,10) NOT NULL,
  quote_amount DECIMAL(30,10) NOT NULL,
  price DECIMAL(30,10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'COMPLETED', 'CANCELLED', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  input_transaction_id UUID REFERENCES public.transactions(id),
  output_transaction_id UUID REFERENCES public.transactions(id),
  CONSTRAINT fk_trading_orders_user_id FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- 4. GAS_SUBSIDIES TABLE
-- Stores gas subsidy transactions
CREATE TABLE IF NOT EXISTS public.gas_subsidies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  payment_amount DECIMAL(30,10) NOT NULL,
  gas_amount DECIMAL(30,10) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. EXCHANGE_RATES TABLE (Optional - for historical rates)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  buy_rate DECIMAL(30,10) NOT NULL,
  sell_rate DECIMAL(30,10) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Trading Orders Indexes
CREATE INDEX IF NOT EXISTS idx_trading_orders_user_id ON public.trading_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_orders_status ON public.trading_orders(status);
CREATE INDEX IF NOT EXISTS idx_trading_orders_created_at ON public.trading_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_trading_orders_order_type ON public.trading_orders(order_type);

-- Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON public.transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_destination_uuid ON public.transactions(destination_uuid);
CREATE INDEX IF NOT EXISTS idx_transactions_from_uuid ON public.transactions(from_uuid);
CREATE INDEX IF NOT EXISTS idx_transactions_state ON public.transactions(state);

-- Gas Subsidies Indexes
CREATE INDEX IF NOT EXISTS idx_gas_subsidies_user_address ON public.gas_subsidies(user_address);
CREATE INDEX IF NOT EXISTS idx_gas_subsidies_status ON public.gas_subsidies(status);
CREATE INDEX IF NOT EXISTS idx_gas_subsidies_created_at ON public.gas_subsidies(created_at);

-- Tokens Indexes
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON public.tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_is_active ON public.tokens(is_active);

-- Exchange Rates Indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_token_id ON public.exchange_rates(token_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_timestamp ON public.exchange_rates(timestamp);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_is_active ON public.exchange_rates(is_active);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert USDC token
INSERT INTO public.tokens (symbol, name, address, decimals, pxo_buy_price, pxo_sell_price, is_active)
VALUES (
  'USDC',
  'USD Coin',
  '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  6,
  1.12,
  1.12,
  true
) ON CONFLICT (symbol) DO UPDATE SET
  pxo_buy_price = EXCLUDED.pxo_buy_price,
  pxo_sell_price = EXCLUDED.pxo_sell_price,
  updated_at = NOW();

-- Insert initial exchange rate
INSERT INTO public.exchange_rates (token_id, buy_rate, sell_rate, is_active)
SELECT 
  t.id,
  t.pxo_buy_price,
  t.pxo_sell_price,
  true
FROM public.tokens t
WHERE t.symbol = 'USDC'
ON CONFLICT DO NOTHING;

-- =====================================================
-- USEFUL QUERIES
-- =====================================================

-- Query to get user's order history
/*
SELECT 
  o.id,
  o.order_type,
  o.currency_pair,
  o.base_amount,
  o.quote_amount,
  o.price,
  o.status,
  o.created_at,
  o.completed_at,
  it.tx_hash as input_tx_hash,
  ot.tx_hash as output_tx_hash
FROM public.trading_orders o
LEFT JOIN public.transactions it ON o.input_transaction_id = it.id
LEFT JOIN public.transactions ot ON o.output_transaction_id = ot.id
WHERE o.user_id = $1
ORDER BY o.created_at DESC;
*/

-- Query to get current exchange rates
/*
SELECT 
  t.symbol,
  t.name,
  t.pxo_buy_price,
  t.pxo_sell_price,
  t.is_active
FROM public.tokens t
WHERE t.is_active = true
ORDER BY t.symbol;
*/

-- Query to get gas subsidies for a user
/*
SELECT 
  gs.id,
  gs.user_address,
  gs.payment_amount,
  gs.gas_amount,
  gs.tx_hash,
  gs.status,
  gs.created_at
FROM public.gas_subsidies gs
WHERE gs.user_address = $1
ORDER BY gs.created_at DESC;
*/

-- =====================================================
-- PERMISSIONS (if needed)
-- =====================================================

-- Grant permissions to authenticated users
-- GRANT SELECT, INSERT, UPDATE ON public.trading_orders TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON public.gas_subsidies TO authenticated;
-- GRANT SELECT ON public.tokens TO authenticated;
-- GRANT SELECT ON public.exchange_rates TO authenticated;

-- =====================================================
-- NOTES
-- =====================================================

/*
This schema supports:

1. **Token Management**: Store multiple tokens with their exchange rates
2. **Order Tracking**: Complete buy/sell order lifecycle
3. **Transaction History**: All blockchain transactions
4. **Gas Subsidies**: Track gas subsidy payments
5. **Exchange Rate History**: Historical rate tracking (optional)

Key Features:
- UUID primary keys for better performance
- Proper foreign key relationships
- Check constraints for data integrity
- Comprehensive indexing for performance
- Support for multiple tokens (not just USDC)
- Status tracking for orders and transactions
- Timestamp tracking for audit trails

Usage:
1. Run this SQL in your Supabase SQL editor
2. Or use the setup-database.js script
3. The system will automatically create all necessary tables and indexes
*/

