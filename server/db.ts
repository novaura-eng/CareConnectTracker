import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use DATABASE_URL for now (SUPABASE_DATABASE_URL needs to be properly configured)
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with explicit SSL configuration for compatibility
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false } 
});

// Set explicit search_path to ensure we're in the same schema as drizzle-kit
pool.query("SET search_path TO public").catch(console.error);

export const db = drizzle(pool, { schema });