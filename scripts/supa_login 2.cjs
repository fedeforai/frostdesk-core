const fs = require('fs');
const path = require('path');

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv(path.resolve(process.cwd(), '.env'));

const { createClient } = require('@supabase/supabase-js');

(async () => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('SUPABASE_URL=', url || 'MISSING');
  console.log('HAS_SUPABASE_KEY=', Boolean(key));

  if (!url || !key) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }
  if (!email || !password) {
    console.error('Missing TEST_EMAIL / TEST_PASSWORD env');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(data.session?.access_token || 'NO_SESSION');
})();
