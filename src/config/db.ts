import type pg from "pg";
import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";
import { env } from "./env";
import { logger } from "./logger";

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(poolConfig);

pool.on("connect", () => {
  logger.info("Database client connected");
});

pool.on("error", (err) => {
  logger.error(err, "Unexpected database error");
});

export async function query<T extends QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  logger.debug({ text, duration, rows: result.rowCount }, "Executed query");
  return result;
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

export async function closePool(): Promise<void> {
  await pool.end();
  logger.info("Database pool closed");
}
