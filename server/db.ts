import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Build Supabase connection string with correct pooler hostname
const supabaseConnectionString = process.env.SUPABASE_PASSWORD 
  ? `postgresql://postgres.ripejazpgtjutmjqfiql:${encodeURIComponent(process.env.SUPABASE_PASSWORD)}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
  : null;

// Use Supabase database if configured, fallback to Replit PostgreSQL
const databaseUrl = supabaseConnectionString || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });