-- Create users table
create table
  public.users (
    id uuid not null default extensions.uuid_generate_v4 (),
    first_name character varying(255) null,
    last_name character varying(255) null,
    mail character varying(255) not null,
    profile_picture text null,
    country character varying(100) null,
    wallet_address character varying(255) null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    last_access timestamp with time zone null,
    identification_photos text[] null,
    user_type character varying(50) null,
    "imagen_KYC" text null,
    selfie_pictures text[] null,
    provider_id text null,
    risk_type integer null,
    role_type uuid null,
    legal_identification text null,
    "KYC_status" text null default 'PENDING',
    pin_hash text null,
    bank_name text null,
    account_number text null,
    "CLABE" text null,
    verificated boolean null default false,
    passport text null,
    phone text null,
    constraint users_pkey primary key (id),
    constraint users_mail_key unique (mail),
    constraint users_provider_id_key unique (provider_id),
    constraint users_wallet_address_key unique (wallet_address)
  ) tablespace pg_default;

-- Create indexes
create index if not exists idx_users_mail on public.users using btree (mail) tablespace pg_default;
create index if not exists idx_users_wallet_address on public.users using btree (wallet_address) tablespace pg_default;
create index if not exists idx_users_country on public.users using btree (country) tablespace pg_default;
create index if not exists idx_users_kyc_status on public.users using btree ("KYC_status") tablespace pg_default;

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Create policies
create policy "Users can view their own data" on public.users
  for select using (auth.uid()::text = provider_id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid()::text = provider_id);

create policy "Users can insert their own data" on public.users
  for insert with check (auth.uid()::text = provider_id);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger handle_users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();




