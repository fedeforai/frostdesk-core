-- =============================================================================
-- Option A identity: instructor_profiles.id = user_id = auth.users.id
-- Idempotent: CHECK user_id = id; ensure FK(id) -> auth.users(id) exists.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Verification queries (run manually; keep as comments)
-- -----------------------------------------------------------------------------
-- Mismatch count (expect 0):
--   SELECT count(*) AS id_user_id_mismatch
--   FROM public.instructor_profiles
--   WHERE id IS DISTINCT FROM user_id;
--
-- Profiles missing in auth.users (expect 0 if Option A holds):
--   SELECT p.id
--   FROM public.instructor_profiles p
--   LEFT JOIN auth.users u ON u.id = p.id
--   WHERE u.id IS NULL;
--
-- List of FKs on instructor_profiles (referenced table):
--   SELECT c.conname AS fk_name,
--          c.confrelid::regclass AS referenced_table,
--          (SELECT array_agg(a.attname ORDER BY array_position(ARRAY(SELECT unnest(c.conkey) ORDER BY 1), a.attnum))
--           FROM pg_attribute a
--           WHERE a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) AND NOT a.attisdropped) AS local_cols,
--          (SELECT array_agg(a.attname ORDER BY array_position(ARRAY(SELECT unnest(c.confkey) ORDER BY 1), a.attnum))
--           FROM pg_attribute a
--           WHERE a.attrelid = c.confrelid AND a.attnum = ANY(c.confkey) AND NOT a.attisdropped) AS ref_cols
--   FROM pg_constraint c
--   WHERE c.conrelid = 'public.instructor_profiles'::regclass AND c.contype = 'f';

-- -----------------------------------------------------------------------------
-- 1) CHECK constraint: user_id = id (only if not exists)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.instructor_profiles'::regclass
      AND conname = 'chk_instructor_profiles_user_id_equals_id'
      AND contype = 'c'
  ) THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_user_id_equals_id
      CHECK (user_id = id);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) FK instructor_profiles(id) -> auth.users(id): verify existing or add
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_id_fkey_ref regclass;
  v_new_fk_exists boolean;
BEGIN
  -- What does instructor_profiles_id_fkey reference (if it exists)?
  SELECT c.confrelid INTO v_id_fkey_ref
  FROM pg_constraint c
  WHERE c.conrelid = 'public.instructor_profiles'::regclass
    AND c.contype = 'f'
    AND c.conname = 'instructor_profiles_id_fkey'
  LIMIT 1;

  -- Already correct: existing FK points to auth.users
  IF v_id_fkey_ref = 'auth.users'::regclass THEN
    RETURN;
  END IF;

  -- Our new-named FK already present
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conrelid = 'public.instructor_profiles'::regclass
      AND c.contype = 'f'
      AND c.conname = 'fk_instructor_profiles_id_auth_users'
  ) INTO v_new_fk_exists;
  IF v_new_fk_exists THEN
    RETURN;
  END IF;

  -- No FK from id to auth.users: add one (new name; do not drop instructor_profiles_id_fkey)
  ALTER TABLE public.instructor_profiles
    ADD CONSTRAINT fk_instructor_profiles_id_auth_users
    FOREIGN KEY (id) REFERENCES auth.users(id);
END $$;
