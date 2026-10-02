import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Database; __sql?: postgres.Sql };

function create(): Database {
  const client = postgres(env().DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });
  globalForDb.__sql = client;
  return drizzle(client, { schema });
}

/** Shared connection pool (reused across hot reloads in development). */
export function db(): Database {
  if (!globalForDb.__db) globalForDb.__db = create();
  return globalForDb.__db;
}

export { schema };
