-- Create kyc_requests table
create table
  public.kyc_requests (
    id uuid not null default extensions.uuid_generate_v4 (),
    user_id uuid not null,
    first_name character varying(255) not null,
    last_name character varying(255) not null,
    email character varying(255) not null,
    phone character varying(50) null,
    country character varying(100) null,
    legal_identification_type character varying(20) not null check (legal_identification_type in ('dni', 'passport')),
    identification_photos text[] null,
    passport text null,
    status character varying(20) not null default 'PENDING' check (status in ('PENDING', 'VALIDATING', 'VALIDATED', 'REJECTED')),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    reviewed_at timestamp with time zone null,
    reviewed_by uuid null,
    rejection_reason text null,
    constraint kyc_requests_pkey primary key (id),
    constraint kyc_requests_user_id_fkey foreign key (user_id) references public.users (id) on delete cascade,
    constraint kyc_requests_reviewed_by_fkey foreign key (reviewed_by) references public.users (id) on delete set null
  ) tablespace pg_default;

-- Create indexes
create index if not exists idx_kyc_requests_user_id on public.kyc_requests using btree (user_id) tablespace pg_default;
create index if not exists idx_kyc_requests_status on public.kyc_requests using btree (status) tablespace pg_default;
create index if not exists idx_kyc_requests_created_at on public.kyc_requests using btree (created_at desc) tablespace pg_default;
create index if not exists idx_kyc_requests_reviewed_by on public.kyc_requests using btree (reviewed_by) tablespace pg_default;

-- Enable Row Level Security (RLS)
alter table public.kyc_requests enable row level security;

-- Create policies for users to view their own requests
create policy "Users can view their own KYC requests" on public.kyc_requests
  for select using (
    auth.uid()::text = (
      select provider_id from public.users where id = user_id
    )
  );

create policy "Users can insert their own KYC requests" on public.kyc_requests
  for insert with check (
    auth.uid()::text = (
      select provider_id from public.users where id = user_id
    )
  );

-- Create policies for admins to view all requests
create policy "Admins can view all KYC requests" on public.kyc_requests
  for select using (
    exists (
      select 1 from public.users 
      where provider_id = auth.uid()::text 
      and (user_type like '%989e3702-b515-4d6e-8627-fa0142a1a88f%' or mail = 'admin@pxo.com')
    )
  );

create policy "Admins can update all KYC requests" on public.kyc_requests
  for update using (
    exists (
      select 1 from public.users 
      where provider_id = auth.uid()::text 
      and (user_type like '%989e3702-b515-4d6e-8627-fa0142a1a88f%' or mail = 'admin@pxo.com')
    )
  );

-- Create function to update updated_at timestamp
create or replace function public.handle_kyc_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger handle_kyc_requests_updated_at
  before update on public.kyc_requests
  for each row
  execute function public.handle_kyc_requests_updated_at();
