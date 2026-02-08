import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

type DbType = ReturnType<typeof createDb>;

let _db: DbType | null = null;

export function getDatabase(): DbType {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// Lazy proxy - delays neon() call until first actual use
export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    const instance = getDatabase();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});
