import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Make database optional for development/demo purposes
const DATABASE_URL = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (DATABASE_URL) {
  try {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (error) {
    console.warn("Database connection failed, using mock storage:", error);
  }
}

export { pool, db };
