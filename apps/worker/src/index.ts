// Load environment variables
import 'dotenv/config';

console.log('Worker starting...');

// Worker ready
console.log('Worker ready');

// Keep process alive
process.on('SIGINT', () => {
  console.log('Worker shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Worker shutting down...');
  process.exit(0);
});
