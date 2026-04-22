-- ============================================================================
-- ADR 0002 — Migración complementaria a 001_kyc_submissions.sql
-- Agrega RLS + policies + trigger updated_at a kyc_submissions
-- Idempotente: seguro de re-ejecutar.
-- ============================================================================

-- 1) Garantizar que la tabla existe (no-op si 001 ya corrió)
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

-- 2) CHECK constraint sobre status (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kyc_submissions_status_check'
  ) then
    alter table kyc_submissions
      add constraint kyc_submissions_status_check
      check (status in ('pending_review', 'approved', 'rejected', 'cancelled'));
  end if;
end $$;

-- 3) Trigger updated_at
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
  for each row
  execute function public.handle_kyc_submissions_updated_at();

-- 4) Row Level Security
alter table public.kyc_submissions enable row level security;

-- 5) Policies (drop+create para idempotencia)
-- TODO ADR-0001: reemplazar el check de admin por roles normalizados.
drop policy if exists "Users read own kyc submissions" on public.kyc_submissions;
create policy "Users read own kyc submissions" on public.kyc_submissions
  for select using (
    auth.uid()::text = (
      select provider_id from public.users where id = user_id
    )
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

-- Inserts y updates desde la app pasan SIEMPRE por el microservicio api-kyc
-- usando service_role (que bypassea RLS). Por eso NO hay policy de INSERT
-- para usuarios — si la necesitás luego, agregar acá.

-- ============================================================================
-- Verificación
-- ============================================================================
-- Después de ejecutar, este SELECT debe devolver 4 policies:
--
-- select policyname, cmd, qual::text
-- from pg_policies
-- where schemaname = 'public' and tablename = 'kyc_submissions';
--
-- Y este debe devolver 'YES':
--
-- select relrowsecurity from pg_class where relname = 'kyc_submissions';
