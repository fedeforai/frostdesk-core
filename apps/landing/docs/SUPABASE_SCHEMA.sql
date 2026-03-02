-- FrostDesk Landing: waitlist table and onboarding status
-- Run in Supabase SQL Editor (or migrations).

-- Waitlist signups (extended for deposit + onboarding status)
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  email text not null,
  phone text,
  resort text,
  instructor_type text,
  languages text,
  experience text,
  high_season_weeks text,
  lang text not null default 'en',

  -- Pre-launch deposit (Stripe)
  deposit_paid boolean not null default false,
  stripe_session_id text,

  -- Onboarding state: waitlist | deposit_paid | invited | active
  status text not null default 'waitlist' check (status in ('waitlist', 'deposit_paid', 'invited', 'active'))
);

-- Unique email for waitlist (one signup per email)
create unique index if not exists waitlist_email_key on public.waitlist (email);

-- RLS: allow service role / anon from API routes; restrict from public if needed
alter table public.waitlist enable row level security;

create policy "Service role and anon can manage waitlist"
  on public.waitlist
  for all
  using (true)
  with check (true);

-- Optional: after Stripe webhook, set status to 'deposit_paid' when deposit_paid = true
-- You can do this in the webhook handler (update deposit_paid and optionally status).
-- For "invited" / "active", update manually or via admin.

comment on column public.waitlist.deposit_paid is 'Set by Stripe webhook on checkout.session.completed';
comment on column public.waitlist.stripe_session_id is 'Stripe Checkout session id';
comment on column public.waitlist.status is 'waitlist | deposit_paid | invited | active; only invited/active can access onboarding';
