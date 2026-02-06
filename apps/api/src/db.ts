import { createDbClient } from '@frostdesk/db';

type DbClient = ReturnType<typeof createDbClient>;
let db: DbClient | null = null;

export function getDb(): DbClient {
  if (!db) {
    db = createDbClient();
  }
  if (!db) {
    throw new Error('Failed to create database client');
  }
  return db;
}
