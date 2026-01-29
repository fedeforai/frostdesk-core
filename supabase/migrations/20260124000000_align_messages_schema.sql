-- Align messages table to canonical schema
-- Migrates from legacy (role, content) to canonical (direction, message_text, channel, etc.)

-- Step 1: Add new canonical columns (nullable initially for data migration)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT,
  ADD COLUMN IF NOT EXISTS message_text TEXT,
  ADD COLUMN IF NOT EXISTS sender_identity TEXT,
  ADD COLUMN IF NOT EXISTS external_message_id TEXT,
  ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Step 2: Migrate data from legacy columns to canonical columns (only if legacy columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'role'
  ) THEN
    UPDATE messages
    SET
      direction = CASE
        WHEN role = 'user' THEN 'inbound'
        WHEN role = 'assistant' THEN 'outbound'
        ELSE 'inbound'
      END,
      message_text = content,
      channel = COALESCE(channel, 'whatsapp')
    WHERE direction IS NULL OR message_text IS NULL OR channel IS NULL;
  ELSE
    -- Legacy columns don't exist, just set defaults for new columns
    UPDATE messages
    SET
      channel = COALESCE(channel, 'whatsapp'),
      direction = COALESCE(direction, 'inbound')
    WHERE channel IS NULL OR direction IS NULL;
  END IF;
END $$;

-- Step 3: Make required columns NOT NULL after data migration
ALTER TABLE messages
  ALTER COLUMN channel SET NOT NULL,
  ALTER COLUMN direction SET NOT NULL;

-- Step 4: Add check constraint for direction
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_direction_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_direction_check CHECK (direction IN ('inbound', 'outbound'));

-- Step 5: Drop legacy columns
ALTER TABLE messages
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS content;

-- Step 6: Drop legacy check constraint if it exists
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_role_check;
