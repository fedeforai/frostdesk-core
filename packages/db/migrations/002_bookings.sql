-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  instructor_id INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on conversation_id
CREATE INDEX IF NOT EXISTS idx_bookings_conversation_id ON bookings(conversation_id);

-- Create index on date
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
