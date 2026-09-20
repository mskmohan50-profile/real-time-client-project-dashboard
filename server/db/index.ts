import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Add it to your .env file.');
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });

    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params: any[] = []
): Promise<{ rows: T[]; affectedRows?: number }> {
  const client = getPool();
  const result = await client.query(sql, params);
  return {
    rows: (result.rows || []) as T[],
    affectedRows: result.rowCount ?? undefined,
  };
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const { rows } = await query<T>(sql, params);
  return rows[0] || null;
}

export async function exec(sql: string): Promise<void> {
  const client = getPool();
  await client.query(sql);
}

export async function initDb(): Promise<void> {
  const schemaPath = path.join(process.cwd(), 'server', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await exec(schemaSql);
  }
}