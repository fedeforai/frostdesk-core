/**
 * Production Startup Checks
 *
 * Validates that critical environment variables are set and debug
 * flags are disabled before the API starts in production.
 *
 * Runs only when NODE_ENV === 'production'.
 * Exits the process if a critical variable is missing.
 */

interface CheckResult {
  critical: string[];
  warnings: string[];
}

export function runStartupChecks(): CheckResult {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    return { critical: [], warnings: [] };
  }

  const critical: string[] = [];
  const warnings: string[] = [];

  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'META_WHATSAPP_TOKEN',
    'META_APP_SECRET',
  ];

  for (const v of requiredVars) {
    if (!process.env[v]) {
      critical.push(`Missing required env var: ${v}`);
    }
  }

  const debugFlags: Array<{ name: string; badValue: string }> = [
    { name: 'ALLOW_DEBUG_USER', badValue: '1' },
    { name: 'SKIP_WHATSAPP_SIGNATURE_VERIFY', badValue: '1' },
  ];

  for (const { name, badValue } of debugFlags) {
    if (process.env[name] === badValue) {
      critical.push(`Debug flag ${name}=${badValue} must not be enabled in production`);
    }
  }

  const recommendedVars = [
    'SENTRY_DSN',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  for (const v of recommendedVars) {
    if (!process.env[v]) {
      warnings.push(`Recommended env var not set: ${v}`);
    }
  }

  return { critical, warnings };
}

export function enforceStartupChecks(): void {
  const { critical, warnings } = runStartupChecks();

  for (const w of warnings) {
    console.warn(`⚠️  STARTUP WARNING: ${w}`);
  }

  if (critical.length > 0) {
    for (const c of critical) {
      console.error(`❌ STARTUP CRITICAL: ${c}`);
    }
    console.error(`\n❌ ${critical.length} critical startup check(s) failed. Exiting.`);
    process.exit(1);
  }
}
