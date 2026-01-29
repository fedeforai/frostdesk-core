create table if not exists public.booking_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  instructor_id uuid not null,
  actor_user_id uuid not null,

  action text not null check (action in ('AI_DRAFT_CONFIRMED')),
  request_id text not null,

  booking_id uuid not null,

  draft_payload jsonb not null,

  user_agent text null,
  ip_address text null
);

create index if not exists booking_audit_log_instructor_id_idx
  on public.booking_audit_log (instructor_id, created_at desc);

create unique index if not exists booking_audit_log_request_id_unique
  on public.booking_audit_log (instructor_id, request_id);
