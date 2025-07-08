import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSurveyResponseSchema, insertPatientSchema, insertWeeklyCheckInSchema } from "@shared/schema";
import { smsService } from "./services/sms";
import { sendCaregiverWeeklyEmail } from "./services/email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get survey form by check-in ID
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

  // Get dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get recent responses
  app.get("/api/admin/responses", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const responses = await storage.getRecentResponses(limit);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all caregivers
  app.get("/api/caregivers", async (req, res) => {
    try {
      const caregivers = await storage.getAllCaregivers();
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all patients
  app.get("/api/patients", async (req, res) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete caregiver
  app.delete("/api/caregivers/:id", async (req, res) => {
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

  // Create patient
  app.post("/api/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get patients by caregiver
  app.get("/api/patients/:caregiverId", async (req, res) => {
    try {
      const caregiverId = parseInt(req.params.caregiverId);
      const patients = await storage.getPatientsByCaregiver(caregiverId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create weekly check-in
  app.post("/api/check-ins", async (req, res) => {
    try {
      const validatedData = insertWeeklyCheckInSchema.parse(req.body);
      const checkIn = await storage.createWeeklyCheckIn(validatedData);
      res.json(checkIn);
    } catch (error) {
      console.error("Error creating check-in:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new caregiver
  app.post("/api/caregivers", async (req, res) => {
    try {
      const caregiver = await storage.createCaregiver(req.body);
      res.json(caregiver);
    } catch (error) {
      console.error("Error creating caregiver:", error);
      res.status(500).json({ message: "Internal server error" });
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
        email // Use the recipient's email as sender for testing
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
