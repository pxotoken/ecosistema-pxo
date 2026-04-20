-- =====================================================
-- UPDATE USERS TABLE FOR KYC FUNCTIONALITY
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS passport text null;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS phone text null;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS legal_identification_type text null;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS legal_identification text null;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_provider text null;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_provider_class text null;

-- Update existing columns if needed
ALTER TABLE public.users 
ALTER COLUMN "KYC_status" SET DEFAULT 'PENDING';

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_users_passport ON public.users (passport);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);
CREATE INDEX IF NOT EXISTS idx_users_legal_identification_type ON public.users (legal_identification_type);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON public.users (auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_class ON public.users (auth_provider_class);

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

