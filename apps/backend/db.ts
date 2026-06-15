import pg from "pg";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./env";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("DB pool error:", err.message);
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

const MAX_RETRIES = 2;

export async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const msg = (e as Error).message ?? "";
      if (
        msg.includes("Connection terminated") ||
        msg.includes("socket") ||
        msg.includes("timeout")
      ) {
        if (i < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 200 * (i + 1)));
          continue;
        }
      }
      throw e;
    }
  }
  throw lastErr;
}
