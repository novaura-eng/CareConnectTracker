import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { schedulerService } from "./services/scheduler";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Improved environment detection
  const nodeEnv = process.env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  
  log(`🚀 Starting server in ${nodeEnv} mode`);
  log(`📝 Environment detection: NODE_ENV=${nodeEnv}, isProduction=${isProduction}`);
  
  const server = await registerRoutes(app);
  log(`✅ Routes registered successfully`);
  
  // Initialize scheduler (imported at top, runs on import)
  log(`⏰ Scheduler initialized - Weekly check-ins will be created every Monday at 10 AM UTC`);
  
  // Add deployment health check endpoint with real connectivity tests
  app.get('/api/health', async (req, res) => {
    const healthChecks = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      checks: {
        database: { status: 'unknown' },
        session: { status: 'unknown' },
        services: {
          twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'disabled',
          sendgrid: process.env.SENDGRID_API_KEY ? 'configured' : 'disabled'
        }
      }
    };

    try {
      // Test database connectivity
      const { pool } = await import("./db");
      await pool.query('SELECT 1');
      healthChecks.checks.database = { status: 'connected' };
      
      // Test session store connectivity
      await pool.query('SELECT COUNT(*) FROM sessions');
      healthChecks.checks.session = { status: 'table_accessible' };
      
    } catch (dbError) {
      healthChecks.status = 'degraded';
      healthChecks.checks.database = { 
        status: 'error' as const
      };
      console.error('🩺 Health check database error:', dbError);
    }

    const statusCode = healthChecks.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthChecks);
  });
  log(`🩺 Health check endpoint added at /api/health`);
  
  // Add route verification for debugging
  log(`🔍 Verifying critical API endpoints are registered:`);
  const criticalRoutes = [
    'GET /api/health',
    'POST /api/caregiver/login',
    'POST /api/caregiver/check-eligibility',
    'GET /api/caregiver/session',
    'POST /api/caregiver/logout'
  ];
  log(`   📋 Expected caregiver endpoints: ${criticalRoutes.join(', ')}`);
  log(`   🔧 If endpoints return 404 in production, check build process`);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error for debugging but DO NOT throw after responding
    console.error(`🚨 Server error (${status}):`, {
      message: err.message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
    });

    // Send error response and continue (don't crash the server)
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // Setup development or production mode
  if (!isProduction) {
    log(`🔧 Setting up Vite development server`);
    await setupVite(app, server);
  } else {
    log(`📦 Setting up production static file serving`);
    
    // Verify build artifacts before attempting to serve static files
    const path = await import("path");
    const fs = await import("fs");
    const { fileURLToPath } = await import("url");
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(currentDir, "..", "dist", "public");
    const serverBundle = path.resolve(currentDir, "..", "dist", "index.js");
    
    log(`🔍 Checking build artifacts:`);
    log(`   - Client build: ${distPath}`);
    log(`   - Server bundle: ${serverBundle}`);
    
    if (!fs.existsSync(distPath)) {
      log(`❌ Client build directory not found: ${distPath}`);
      log(`💡 Production requires building the client first`);
      log(`🔧 Run: npm run build`);
      throw new Error(`Missing client build artifacts. Run 'npm run build' first.`);
    }
    
    if (!fs.existsSync(serverBundle)) {
      log(`⚠️  Server bundle not found: ${serverBundle}`);
      log(`💡 You might be running the unbundled server in production`);
      log(`🔧 For optimal performance, run: npm run build && npm run start`);
    }
    
    try {
      // Serve static files directly using the verified distPath
      app.use(express.static(distPath));
      
      // Fall back to index.html for client-side routing
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
      
      log(`✅ Production static files configured successfully`);
      log(`🌐 API endpoints available under /api/`);
      log(`📱 Frontend served from: ${distPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`❌ Production static file setup failed: ${errorMessage}`);
      log(`💡 This might indicate corrupted build artifacts`);
      log(`🔧 Try: rm -rf dist && npm run build`);
      throw error;
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
