import './loadEnv.js';
import { getLoadedEnvPath } from './loadEnv.js';
import { enforceStartupChecks } from './lib/startup_checks.js';
import { initSentry } from './lib/sentry.js';
import { buildServer } from './server.js';
import { startOutboundSendWorker } from './whatsapp/send_worker.js';

enforceStartupChecks();
initSentry();

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Mask DATABASE_URL for logging (show first 20 chars + ...)
const maskUrl = (url: string | undefined): string => {
  if (!url) return 'not set';
  if (url.length <= 20) return '***';
  return url.substring(0, 20) + '...';
};

async function start() {
  const server = await buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
    startOutboundSendWorker({ log: server.log, enabled: true });
    console.log(`🚀 FrostDesk API server listening on http://${HOST}:${PORT}`);
    console.log(`📡 Webhook endpoint: POST http://${HOST}:${PORT}/webhook`);
    console.log(`❤️  Health check: GET http://${HOST}:${PORT}/health`);
    console.log(`🗄️  DATABASE_URL: ${maskUrl(process.env.DATABASE_URL)}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📁 loadedEnvPath: ${getLoadedEnvPath() ?? 'none'}`);
      console.log(`🔑 SUPABASE_URL present? ${!!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)}`);
      console.log(`🔑 SUPABASE_ANON_KEY present? ${!!(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)}`);
      console.log('🔎 SUPABASE_ANON_KEY len:', (process.env.SUPABASE_ANON_KEY ?? '').length);
      console.log('🔎 NEXT_PUBLIC_SUPABASE_ANON_KEY len:', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').length);
      console.log('🔎 SUPABASE_SERVICE_ROLE_KEY len:', (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').length);
      console.log('🔎 SUPABASE_URL:', process.env.SUPABASE_URL);
    }
    server.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
