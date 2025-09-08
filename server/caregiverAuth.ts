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
  
  const sessionStore = new pgStore({
    conString: supabaseConnectionString || process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    name: "caregiver-session",
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
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
  app.use("/api/caregiver", getCaregiverSession());
}