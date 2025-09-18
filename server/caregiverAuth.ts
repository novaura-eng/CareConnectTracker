import { type Express, type RequestHandler } from "express";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session data interface
declare module "express-session" {
  interface SessionData {
    caregiverId?: number;
    caregiverState?: string;
  }
}

export function getCaregiverSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  // Build Supabase connection string if available
  const supabaseConnectionString = process.env.SUPABASE_PASSWORD 
    ? `postgresql://postgres.ripejazpgtjutmjqfiql:${encodeURIComponent(process.env.SUPABASE_PASSWORD)}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
    : null;
  
  const connectionString = supabaseConnectionString || process.env.DATABASE_URL;
  console.log(`🔐 Caregiver session store connecting to: ${connectionString ? 'DATABASE CONFIGURED' : 'NO DATABASE CONFIGURED'}`);
  
  const sessionStore = new pgStore({
    conString: connectionString,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions", // Same table as regular auth but different session name
  });
  
  const sessionConfig = {
    name: "caregiver-session", // Unique name to separate from regular auth
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // Consistent with regular auth - always secure
      maxAge: sessionTtl,
      sameSite: 'lax' as const, // Add explicit sameSite for better compatibility
    },
  };
  
  console.log(`🔐 Caregiver session config: name="${sessionConfig.name}", secure=${sessionConfig.cookie.secure}, sameSite=${sessionConfig.cookie.sameSite}`);
  
  return session(sessionConfig);
}

export const isCaregiver: RequestHandler = async (req, res, next) => {
  if (!req.session?.caregiverId) {
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }
  
  try {
    const caregiver = await storage.getCaregiver(req.session.caregiverId);
    if (!caregiver || !caregiver.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized - Invalid caregiver" });
    }
    
    // Add caregiver to request object
    (req as any).caregiver = caregiver;
    next();
  } catch (error) {
    console.error("Error validating caregiver session:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupCaregiverAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use("/api/caregiver", getCaregiverSession());
}