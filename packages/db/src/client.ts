import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Serverless (e.g. Vercel): use pooler URL (e.g. Supabase pooler) and keep pool small per instance.
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME != null;
const maxConnections = isServerless ? 2 : 10;

export const sql = postgres(databaseUrl, {
  max: maxConnections,
  idle_timeout: 20,
  connect_timeout: 10,
});
