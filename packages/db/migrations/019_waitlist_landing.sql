-- FrostDesk Landing: waitlist table for landing signups, deposit and onboarding status.
-- Required when the Instructor app serves the landing (/, /[lang]). Apply via Supabase SQL Editor
-- or your migration runner if you use one.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  resort TEXT,
  instructor_type TEXT,
  languages TEXT,
  experience TEXT,
  high_season_weeks TEXT,
  lang TEXT NOT NULL DEFAULT 'en',

  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_session_id TEXT,

  status TEXT NOT NULL DEFAULT 'waitlist' CHECK (status IN ('waitlist', 'deposit_paid', 'invited', 'active'))
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_key ON public.waitlist (email);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role and anon can manage waitlist" ON public.waitlist;
CREATE POLICY "Service role and anon can manage waitlist"
  ON public.waitlist
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.waitlist IS 'Landing waitlist signups; deposit_paid/status updated by Stripe webhook.';
COMMENT ON COLUMN public.waitlist.deposit_paid IS 'Set by Stripe webhook on checkout.session.completed';
COMMENT ON COLUMN public.waitlist.stripe_session_id IS 'Stripe Checkout session id';
COMMENT ON COLUMN public.waitlist.status IS 'waitlist | deposit_paid | invited | active; only invited/active can access onboarding';
