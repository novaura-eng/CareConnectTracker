import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userType?: "admin" | "caregiver";
    caregiverId?: number;
  }
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getUnifiedSession() {
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
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: 'lax' as const,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertAdminUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    userType: "admin",
    caregiverId: null,
  });
}

// Authentication middleware
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId || req.session?.userType !== "admin") {
    return res.status(401).json({ message: "Unauthorized - Admin access required" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.userType !== "admin") {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized - Invalid admin user" });
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Error validating admin session:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

export const requireCaregiver: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId || req.session?.userType !== "caregiver") {
    return res.status(401).json({ message: "Unauthorized - Caregiver access required" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.userType !== "caregiver" || !user.caregiverId) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized - Invalid caregiver user" });
    }

    const caregiver = await storage.getCaregiver(user.caregiverId);
    if (!caregiver || !caregiver.isActive) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized - Caregiver account inactive" });
    }
    
    (req as any).user = user;
    (req as any).caregiver = caregiver;
    next();
  } catch (error) {
    console.error("Error validating caregiver session:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Caregiver phone and password login
export async function loginCaregiverWithPhone(phone: string, state: string, password: string): Promise<{ success: boolean; user?: any; caregiver?: any; message: string }> {
  try {
    // Check if caregiver exists and is active
    const caregiver = await storage.getCaregiverByPhoneAndState(phone, state);
    if (!caregiver || !caregiver.isActive) {
      // Provide better error message - check if caregiver exists with this phone in a different state
      const caregiverInOtherState = await storage.getCaregiverByPhone(phone);
      if (caregiverInOtherState && caregiverInOtherState.isActive) {
        return { 
          success: false, 
          message: `Phone number found but in a different state. Please try logging in with state: ${caregiverInOtherState.state}` 
        };
      }
      return { success: false, message: "No active caregiver found with this phone number and state" };
    }

    // Check if password has been set
    const passwordSet = await storage.checkPasswordSet(caregiver.id);
    if (!passwordSet) {
      return { 
        success: false, 
        message: "Password not set. Please contact your administrator to set up your password." 
      };
    }

    // Verify password
    console.log("Password verification debug:", {
      caregiverId: caregiver.id,
      hasPasswordHash: !!caregiver.passwordHash,
      passwordHashLength: caregiver.passwordHash?.length,
      inputPasswordLength: password.length,
      passwordHashPrefix: caregiver.passwordHash?.substring(0, 10)
    });

    if (!caregiver.passwordHash) {
      return { 
        success: false, 
        message: "Password not configured. Please contact your administrator." 
      };
    }

    const passwordValid = await bcrypt.compare(password, caregiver.passwordHash);
    console.log("Password comparison result:", passwordValid);
    
    if (!passwordValid) {
      return { 
        success: false, 
        message: "Invalid password. Please check your credentials and try again." 
      };
    }

    // Check if user account already exists for this caregiver
    let user = await storage.getUserByCaregiverId(caregiver.id);
    
    if (!user) {
      // Create user account for this caregiver
      const userId = `caregiver_${caregiver.id}_${Date.now()}`;
      user = await storage.upsertUser({
        id: userId,
        email: caregiver.email,
        firstName: caregiver.name.split(' ')[0] || caregiver.name,
        lastName: caregiver.name.split(' ').slice(1).join(' ') || '',
        profileImageUrl: null,
        userType: "caregiver",
        caregiverId: caregiver.id,
      });
    }

    return { success: true, user, caregiver, message: "Login successful" };
  } catch (error) {
    console.error("Error during caregiver phone login:", error);
    return { success: false, message: "Login failed - please try again" };
  }
}

export async function setupUnifiedAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getUnifiedSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertAdminUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Keep track of registered domains
  const registeredDomains = new Set(process.env.REPLIT_DOMAINS!.split(","));

  // Admin OAuth routes
  app.get("/api/login", async (req, res, next) => {
    const domain = req.hostname;
    const strategyName = `replitauth:${domain}`;
    
    // Check if strategy exists, if not create it dynamically
    if (!registeredDomains.has(domain)) {
      console.log(`Registering new authentication strategy for domain: ${domain}`);
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredDomains.add(domain);
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    const domain = req.hostname;
    const strategyName = `replitauth:${domain}`;
    
    // Check if strategy exists, if not create it dynamically
    if (!registeredDomains.has(domain)) {
      console.log(`Registering new authentication strategy for domain: ${domain}`);
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredDomains.add(domain);
    }
    
    passport.authenticate(strategyName, {
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) return next(err);
      
      // Set unified session for admin
      const user = req.user as any;
      if (user?.claims) {
        req.session.userId = user.claims.sub;
        req.session.userType = "admin";
        req.session.caregiverId = undefined;
      }
      
      // Redirect admin users to the admin dashboard
      res.redirect("/admin");
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  });

  // Caregiver phone and password login
  app.post("/api/caregiver/login", async (req, res) => {
    try {
      const { phone, state, password } = req.body;
      
      if (!phone || !state || !password) {
        return res.status(400).json({ message: "Phone, state, and password are required" });
      }

      const result = await loginCaregiverWithPhone(phone, state, password);
      
      if (!result.success) {
        return res.status(401).json({ message: result.message });
      }

      // Set unified session for caregiver
      req.session.userId = result.user!.id;
      req.session.userType = "caregiver";
      req.session.caregiverId = result.caregiver!.id;

      res.json({ 
        message: result.message,
        user: {
          id: result.user!.id,
          name: result.caregiver!.name,
          userType: "caregiver",
          state: result.caregiver!.state
        }
      });
    } catch (error) {
      console.error("Error during caregiver login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Unified user info endpoint
  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      if (user.userType === "caregiver" && user.caregiverId) {
        const caregiver = await storage.getCaregiver(user.caregiverId);
        return res.json({
          id: user.id,
          userType: user.userType,
          name: caregiver?.name,
          phone: caregiver?.phone,
          state: caregiver?.state,
          caregiverId: user.caregiverId,
        });
      } else {
        return res.json({
          id: user.id,
          userType: user.userType,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        });
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}