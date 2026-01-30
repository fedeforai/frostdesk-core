import './loadEnv.js';
import 'dotenv/config';
import { buildServer } from './server.js';

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
    console.log(`🚀 FrostDesk API server listening on http://${HOST}:${PORT}`);
    console.log(`📡 Webhook endpoint: POST http://${HOST}:${PORT}/webhook`);
    console.log(`❤️  Health check: GET http://${HOST}:${PORT}/health`);
    console.log(`🗄️  DATABASE_URL: ${maskUrl(process.env.DATABASE_URL)}`);
    server.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
