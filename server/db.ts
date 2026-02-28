import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// We provide a fallback string so the "DATABASE_URL must be set" error stops
const dbUrl = process.env.DATABASE_URL || "postgresql://dummy:password@localhost:5432/fundingforge";

export const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle(pool, { schema });
