import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "../shared/schema"; // Fixed path for SageMaker

// This allows the database driver to work in a serverless/node environment
if (ws) {
  neonConfig.webSocketConstructor = ws;
}

// Fallback to a dummy string so the app starts
const connectionString = process.env.DATABASE_URL || "postgresql://dummy:password@localhost:5432/fundingforge";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
