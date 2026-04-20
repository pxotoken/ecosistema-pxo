-- Create api_logs table
create table
  public.api_logs (
    id uuid not null default extensions.uuid_generate_v4 (),
    provider text not null,
    method text not null,
    endpoint text not null,
    status integer not null,
    response jsonb null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint api_logs_pkey primary key (id)
  ) tablespace pg_default;

-- Create indexes for better performance
create index if not exists idx_api_logs_provider on public.api_logs using btree (provider) tablespace pg_default;
create index if not exists idx_api_logs_status on public.api_logs using btree (status) tablespace pg_default;
create index if not exists idx_api_logs_created_at on public.api_logs using btree (created_at desc) tablespace pg_default;
create index if not exists idx_api_logs_method on public.api_logs using btree (method) tablespace pg_default;

-- Create a function to update updated_at timestamp automatically
create or replace function public.update_api_logs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-update updated_at
create trigger update_api_logs_updated_at
  before update on public.api_logs
  for each row
  execute function public.update_api_logs_updated_at();

-- Optional: Add comments to document the table
comment on table public.api_logs is 'Logs of all external API calls made by the backend';
comment on column public.api_logs.id is 'Unique identifier for each log entry';
comment on column public.api_logs.provider is 'External API provider name (e.g., BINANCE, COINMARKETCAP)';
comment on column public.api_logs.method is 'HTTP method used (GET, POST, PUT, DELETE, PATCH)';
comment on column public.api_logs.endpoint is 'Full API endpoint URL';
comment on column public.api_logs.status is 'HTTP status code (200, 404, 500, etc.)';
comment on column public.api_logs.response is 'API response data in JSON format';
comment on column public.api_logs.created_at is 'Timestamp when the log was created';
comment on column public.api_logs.updated_at is 'Timestamp when the log was last updated';
