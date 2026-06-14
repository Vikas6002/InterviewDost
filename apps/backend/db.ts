import pg from "pg";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DATABASE_URL } from "./env";

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});