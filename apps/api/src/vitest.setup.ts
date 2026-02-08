/**
 * Set dummy env so @frostdesk/db and other modules can load during tests.
 * Tests mock Supabase/DB where needed; this only avoids load-time throws.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/dummy';
}
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x';
}
