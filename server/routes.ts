import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaregiverSchema, insertSurveyResponseSchema, insertPatientSchema, insertWeeklyCheckInSchema } from "@shared/schema";
import { smsService } from "./services/sms";
import { sendCaregiverWeeklyEmail } from "./services/email";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupCaregiverAuth, isCaregiver, hashPassword, verifyPassword } from "./caregiverAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  setupCaregiverAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Caregiver Authentication Routes
  app.post("/api/caregiver/login", async (req, res) => {
    try {
      const { phone, password, state } = req.body;
      
      if (!phone || !password || !state) {
        return res.status(400).json({ message: "Phone, password, and state are required" });
      }

      const caregiver = await storage.getCaregiverByPhoneAndState(phone, state);
      if (!caregiver || !caregiver.isActive) {
        return res.status(401).json({ message: "Invalid credentials or inactive account" });
      }

      if (!caregiver.password) {
        return res.status(401).json({ message: "Password not set. Please contact your administrator." });
      }

      const isValidPassword = await verifyPassword(password, caregiver.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.caregiverId = caregiver.id;
      req.session.caregiverState = state;

      res.json({ 
        message: "Login successful", 
        caregiver: { 
          id: caregiver.id, 
          name: caregiver.name, 
          state: caregiver.state 
        } 
      });
    } catch (error) {
      console.error("Error during caregiver login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/caregiver/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/caregiver/session", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      res.json({ 
        caregiver: { 
          id: caregiver.id, 
          name: caregiver.name, 
          state: caregiver.state 
        } 
      });
    } catch (error) {
      console.error("Error fetching caregiver session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get full caregiver profile (for portal)
  app.get("/api/caregiver/me", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      // Return sanitized caregiver data (exclude password and sensitive fields)
      res.json({
        id: caregiver.id,
        name: caregiver.name,
        phone: caregiver.phone,
        email: caregiver.email,
        emergencyContact: caregiver.emergencyContact,
        state: caregiver.state,
        isActive: caregiver.isActive
      });
    } catch (error) {
      console.error("Error fetching caregiver profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update caregiver profile
  app.put("/api/caregiver/profile", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const { name, email, emergencyContact } = req.body;
      
      if (!name?.trim()) {
        return res.status(400).json({ message: "Name is required" });
      }

      if (email && !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      await storage.updateCaregiverProfile(caregiver.id, {
        name: name.trim(),
        email: email?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null
      });

      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating caregiver profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Change caregiver password
  app.put("/api/caregiver/password", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, caregiver.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateCaregiverPassword(caregiver.id, hashedPassword);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing caregiver password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get pending check-ins for caregiver
  app.get("/api/caregiver/checkins/pending", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const checkIns = await storage.getPendingCheckInsByCaregiver(caregiver.id);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching pending check-ins:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get completed check-ins for caregiver
  app.get("/api/caregiver/checkins/completed", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const checkIns = await storage.getCompletedCheckInsByCaregiver(caregiver.id, limit);
      res.json(checkIns);
    } catch (error) {
      console.error("Error fetching completed check-ins:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/caregiver/patients", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const patients = await storage.getPatientsByCaregiver(caregiver.id);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching caregiver patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/caregiver/previous-response/:patientId", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const patientId = parseInt(req.params.patientId);
      
      const previousResponse = await storage.getCaregiverPreviousResponses(caregiver.id, patientId);
      res.json(previousResponse || null);
    } catch (error) {
      console.error("Error fetching previous response:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Caregiver Account Setup Routes
  app.post("/api/caregiver/check-eligibility", async (req, res) => {
    try {
      const { phone, state } = req.body;
      
      if (!phone || !state) {
        return res.status(400).json({ message: "Phone and state are required" });
      }

      const caregiver = await storage.getCaregiverByPhoneAndState(phone, state);
      if (!caregiver || !caregiver.isActive) {
        return res.status(404).json({ message: "No active caregiver found with this phone number and state" });
      }

      if (caregiver.password) {
        return res.status(400).json({ message: "Account already set up. Please use the login page." });
      }

      res.json({ 
        eligible: true, 
        caregiverName: caregiver.name,
        message: "Account found. You can set up your password." 
      });
    } catch (error) {
      console.error("Error checking caregiver eligibility:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/caregiver/setup-password", async (req, res) => {
    try {
      const { phone, state, password } = req.body;
      
      if (!phone || !state || !password) {
        return res.status(400).json({ message: "Phone, state, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const caregiver = await storage.getCaregiverByPhoneAndState(phone, state);
      if (!caregiver || !caregiver.isActive) {
        return res.status(404).json({ message: "No active caregiver found with this phone number and state" });
      }

      if (caregiver.password) {
        return res.status(400).json({ message: "Password already set for this account" });
      }

      // Hash password and update caregiver
      const hashedPassword = await hashPassword(password);
      await storage.updateCaregiverPassword(caregiver.id, hashedPassword);

      res.json({ 
        message: "Password set successfully! You can now log in.",
        success: true
      });
    } catch (error) {
      console.error("Error setting up caregiver password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get survey form by check-in ID (public route)
  app.get("/api/survey/:checkInId", async (req, res) => {
    try {
      const checkInId = parseInt(req.params.checkInId);
      const checkInDetails = await storage.getWeeklyCheckInWithDetails(checkInId);
      
      if (!checkInDetails) {
        return res.status(404).json({ message: "Check-in not found" });
      }

      res.json(checkInDetails);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit survey response
  app.post("/api/survey/:checkInId/submit", async (req, res) => {
    try {
      const checkInId = parseInt(req.params.checkInId);
      
      // Validate request body
      const validatedData = insertSurveyResponseSchema.parse({
        ...req.body,
        checkInId,
      });

      // Create survey response
      const response = await storage.createSurveyResponse(validatedData);
      
      // Mark check-in as completed
      await storage.updateCheckInCompletion(checkInId);

      res.json({ message: "Survey submitted successfully", response });
    } catch (error) {
      console.error("Error submitting survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get dashboard stats (protected)
  app.get("/api/admin/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recent responses (protected)
  app.get("/api/admin/responses", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const responses = await storage.getRecentResponses(limit);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all caregivers (protected)
  app.get("/api/caregivers", isAuthenticated, async (req, res) => {
    try {
      const caregivers = await storage.getAllCaregivers();
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all patients (protected)
  app.get("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete caregiver (protected)
  app.delete("/api/caregivers/:id", isAuthenticated, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.id);
      await storage.deleteCaregiver(caregiverId);
      res.json({ message: "Caregiver deleted successfully" });
    } catch (error) {
      console.error("Error deleting caregiver:", error);
      const errorMessage = error instanceof Error ? error.message : "Internal server error";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Create patient (protected)
  app.post("/api/patients", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patients by caregiver (protected)
  app.get("/api/patients/:caregiverId", isAuthenticated, async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patients = await storage.getPatientsByCaregiver(caregiverId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create weekly check-in (protected)
  app.post("/api/check-ins", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertWeeklyCheckInSchema.parse(req.body);
      const checkIn = await storage.createWeeklyCheckIn(validatedData);
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating check-in:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new caregiver (protected)
  app.post("/api/caregivers", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating caregiver with data:", req.body);
      
      // Validate request data
      const validatedData = insertCaregiverSchema.parse(req.body);
      console.log("Validated caregiver data:", validatedData);
      
      const caregiver = await storage.createCaregiver(validatedData);
      console.log("Caregiver created successfully:", caregiver);
      res.json(caregiver);
    } catch (error) {
      console.error("Error creating caregiver:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Create new patient
  app.post("/api/patients", async (req, res) => {
    try {
      console.log("Creating patient with data:", req.body);
      
      // Validate required fields
      if (!req.body.name || !req.body.medicaidId) {
        return res.status(400).json({ message: "Name and Medicaid ID are required" });
      }
      
      const patient = await storage.createPatient(req.body);
      console.log("Patient created successfully:", patient);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  // Send SMS reminder
  app.post("/api/send-reminder/:checkInId", async (req, res) => {
    try {
      const checkInId = parseInt(req.params.checkInId);
      const checkInDetails = await storage.getWeeklyCheckInWithDetails(checkInId);
      
      if (!checkInDetails || !checkInDetails.caregiver) {
        return res.status(404).json({ message: "Check-in or caregiver not found" });
      }

      const surveyUrl = `${process.env.SURVEY_BASE_URL || 'http://localhost:5000'}/survey/${checkInId}`;
      
      await smsService.sendWeeklyCheckInReminder(
        checkInDetails.caregiver.phone,
        checkInDetails.caregiver.name,
        checkInDetails.patient.name,
        surveyUrl
      );

      res.json({ message: "Reminder sent successfully" });
    } catch (error) {
      console.error("Error sending reminder:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Manual survey creation endpoint
  app.post("/api/admin/manual-survey", async (req, res) => {
    try {
      const { caregiverId, patientId } = req.body;
      
      if (!caregiverId || !patientId) {
        return res.status(400).json({ message: "Caregiver ID and Patient ID are required" });
      }

      // Get current week dates
      const currentDate = new Date();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Create weekly check-in
      const checkIn = await storage.createWeeklyCheckIn({
        caregiverId,
        patientId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        isCompleted: false,
        remindersSent: 0
      });

      // Get caregiver and patient details
      const caregiver = await storage.getCaregiver(caregiverId);
      const patient = await storage.getPatient(patientId);

      if (!caregiver || !patient) {
        return res.status(404).json({ message: "Caregiver or patient not found" });
      }

      // Generate survey URL for deployed app
      const surveyUrl = `https://care-connect-tracker-tim692.replit.app/survey/${checkIn.id}`;

      res.json({
        surveyId: checkIn.id,
        surveyUrl,
        caregiverName: caregiver.name,
        patientName: patient.name,
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekEnd.toLocaleDateString()
      });
    } catch (error) {
      console.error("Manual survey creation error:", error);
      res.status(500).json({ message: "Failed to create survey" });
    }
  });

  // Test email endpoint
  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      // Get the test check-in details
      const checkInId = 7; // Using our test check-in
      const checkInDetails = await storage.getWeeklyCheckInWithDetails(checkInId);
      
      if (!checkInDetails) {
        return res.status(404).json({ message: "Test data not found" });
      }

      // Always use the deployed Replit domain for email links
      const replitDomain = `https://care-connect-tracker-tim692.replit.app`;
      const surveyUrl = `${replitDomain}/survey/${checkInId}`;
      
      console.log('Test email - Survey URL:', surveyUrl);
      
      const weekStart = new Date(checkInDetails.checkIn.weekStartDate).toLocaleDateString();
      const weekEnd = new Date(checkInDetails.checkIn.weekEndDate).toLocaleDateString();
      
      const success = await sendCaregiverWeeklyEmail(
        email,
        checkInDetails.caregiver.name,
        checkInDetails.patient.name,
        surveyUrl,
        weekStart,
        weekEnd,
        "tbweil40@gmail.com" // Use verified SendGrid sender email
      );

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ 
          message: "SendGrid configuration issue - check console logs for details"
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
