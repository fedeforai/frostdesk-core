-- Align conversations table to canonical schema
-- Adds missing columns: instructor_id, channel, status, updated_at, customer_identifier

-- Step 1: Add new canonical columns (nullable initially for data backfill)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS instructor_id UUID,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_identifier TEXT;

-- Step 2: Backfill data for existing rows
UPDATE conversations
SET
  instructor_id = '00000000-0000-0000-0000-000000000001',
  channel = 'whatsapp',
  status = 'open',
  updated_at = created_at
WHERE instructor_id IS NULL 
   OR channel IS NULL 
   OR status IS NULL 
   OR updated_at IS NULL;

-- Step 3: Set NOT NULL constraints after backfill
ALTER TABLE conversations
  ALTER COLUMN instructor_id SET NOT NULL,
  ALTER COLUMN channel SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Step 4: Add check constraint for status
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_status_check CHECK (status IN ('open', 'requires_human', 'closed'));
