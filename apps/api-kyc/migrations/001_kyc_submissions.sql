-- Tabla que guarda cada envío de KYC del usuario y su revisión manual.
-- Preparada para integración futura con Sumsub (columnas provider_*).
-- La columna de estado consolidado vive en users.KYC_status; esta tabla es el historial/auditoría.

create table if not exists kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- pending_review | approved | rejected | cancelled
  status text not null default 'pending_review',

  -- [{ type: 'id_front' | 'id_back' | 'selfie' | 'proof_of_address', path: 'kyc/<user>/...' }]
  documents jsonb not null default '[]'::jsonb,

  -- { fullName, dateOfBirth, country, documentType, documentNumber, ... }
  personal_info jsonb,

  rejection_reason text,

  -- Provider integration (null today; 'sumsub' later)
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
