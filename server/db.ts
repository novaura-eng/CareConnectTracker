import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use DATABASE_URL for Supabase connection (following blueprint standard)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. This application only connects to Supabase.",
  );
}
const databaseUrl = process.env.DATABASE_URL;

// Create pool with explicit SSL configuration for compatibility
export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false } 
});

// Set explicit search_path to ensure we're in the same schema as drizzle-kit
pool.query("SET search_path TO public").catch(console.error);

export const db = drizzle(pool, { schema });