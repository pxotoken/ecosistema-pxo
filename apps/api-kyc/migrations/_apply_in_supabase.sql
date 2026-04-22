-- ADR 0002 - kyc_submissions (combined 001 + 002, ASCII-only)
-- Paste this in the Supabase SQL Editor and click Run.
-- Idempotent: safe to re-run.

create table if not exists kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending_review',
  documents jsonb not null default '[]'::jsonb,
  personal_info jsonb,
  rejection_reason text,
  provider text,
  provider_ref text,
  provider_status text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kyc_submissions_user_id_idx on kyc_submissions(user_id);
create index if not exists kyc_submissions_status_idx on kyc_submissions(status);
create index if not exists kyc_submissions_provider_ref_idx on kyc_submissions(provider_ref);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'kyc_submissions_status_check') then
    alter table kyc_submissions
      add constraint kyc_submissions_status_check
      check (status in ('pending_review', 'approved', 'rejected', 'cancelled'));
  end if;
end $$;

create or replace function public.handle_kyc_submissions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_kyc_submissions_updated_at on public.kyc_submissions;
create trigger handle_kyc_submissions_updated_at
  before update on public.kyc_submissions
  for each row execute function public.handle_kyc_submissions_updated_at();

alter table public.kyc_submissions enable row level security;

drop policy if exists "Users read own kyc submissions" on public.kyc_submissions;
create policy "Users read own kyc submissions" on public.kyc_submissions
  for select using (
    auth.uid()::text = (select provider_id from public.users where id = user_id)
  );

drop policy if exists "Admins read all kyc submissions" on public.kyc_submissions;
create policy "Admins read all kyc submissions" on public.kyc_submissions
  for select using (
    exists (
      select 1 from public.users
      where provider_id = auth.uid()::text
        and (user_type like '%989e3702-b515-4d6e-8627-fa0142a1a88f%' or mail = 'admin@pxo.com')
    )
  );

drop policy if exists "Admins update kyc submissions" on public.kyc_submissions;
create policy "Admins update kyc submissions" on public.kyc_submissions
  for update using (
    exists (
      select 1 from public.users
      where provider_id = auth.uid()::text
        and (user_type like '%989e3702-b515-4d6e-8627-fa0142a1a88f%' or mail = 'admin@pxo.com')
    )
  );

select count(*) as cols from information_schema.columns
where table_schema = 'public' and table_name = 'kyc_submissions';

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'kyc_submissions';

select relrowsecurity as rls_enabled from pg_class where relname = 'kyc_submissions';
