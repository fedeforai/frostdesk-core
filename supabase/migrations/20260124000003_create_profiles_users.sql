-- Create profiles table for user identity and roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'human_operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role IN ('system_admin', 'human_operator', 'human_approver'))
);

-- Create users table for backward compatibility (fallback role check)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role IN ('admin', 'system_admin', 'human_operator', 'human_approver') OR role IS NULL)
);
