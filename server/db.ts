import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, PGHOST, PGUSER, PGPASSWORD, PGDATABASE, or PGPORT are not set");
}

export const sql = postgres(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
