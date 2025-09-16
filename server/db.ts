import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the same DATABASE_URL that drizzle-kit uses for consistency
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with explicit SSL configuration for compatibility
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

// Set explicit search_path to ensure we're in the same schema as drizzle-kit
pool.query("SET search_path TO public").catch(console.error);

export const db = drizzle(pool, { schema });