-- Create tokens table for exchange rates
CREATE TABLE IF NOT EXISTS public.tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(100) NOT NULL,
  symbol character varying(10) NOT NULL,
  icon_url character varying(255),
  contract_uuid uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  network_id character varying(50),
  pxo_sell_price numeric(30, 10),
  pxo_buy_price numeric(30, 10),
  pxo_sell_commission numeric(30, 10),
  type character varying(20) DEFAULT 'CRYPTO',
  CONSTRAINT tokens_pkey PRIMARY KEY (id),
  CONSTRAINT tokens_symbol_key UNIQUE (symbol)
);

-- Insert USDC token with current exchange rate
INSERT INTO public.tokens (name, symbol, pxo_buy_price, pxo_sell_price, type) 
VALUES ('USD Coin', 'USDC', 1.12, 1.10, 'CRYPTO')
ON CONFLICT (symbol) DO UPDATE SET 
  pxo_buy_price = EXCLUDED.pxo_buy_price,
  pxo_sell_price = EXCLUDED.pxo_sell_price,
  updated_at = now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tokens_symbol ON public.tokens(symbol);
CREATE INDEX IF NOT EXISTS idx_tokens_type ON public.tokens(type);
