import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCaregiverSchema, 
  insertSurveyResponseSchema, 
  insertPatientSchema, 
  insertWeeklyCheckInSchema,
  insertSurveySchema,
  insertSurveyQuestionSchema,
  insertSurveyOptionSchema,
  insertSurveyAssignmentSchema,
  insertSurveyResponseV2Schema,
  insertSurveyResponseItemSchema
} from "@shared/schema";
import { smsService } from "./services/sms";
import { sendCaregiverWeeklyEmail } from "./services/email";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupCaregiverAuth, isCaregiver, hashPassword, verifyPassword } from "./caregiverAuth";
import { db } from "./db";
import { 
  weeklyCheckIns, 
  surveyAssignments, 
  surveyResponsesV2, 
  surveyResponseItems 
} from "@shared/schema";
import { eq } from "drizzle-orm";

// Helper function to validate survey answers against question schemas
function validateSurveyAnswers(answers: Record<string, any>, questions: Array<{ id: number; label: string; type: string; required: boolean; validation?: any; options?: Array<{ value: string }> }>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Create a map of questions for efficient lookup
  const questionMap = new Map();
  questions.forEach((q: { id: number; label: string; type: string; required: boolean; validation?: any; options?: Array<{ value: string }> }) => questionMap.set(q.id, q));
  
  // Check required questions are answered
  for (const question of questions) {
    if (question.required) {
      const answer = answers[question.id.toString()];
      if (answer === undefined || answer === null || answer === '') {
        errors.push(`Question "${question.label}" is required`);
      }
    }
  }
  
  // Validate answer types and constraints
  for (const [questionId, answer] of Object.entries(answers as Record<string, any>)) {
    const qId = parseInt(questionId);
    const question = questionMap.get(qId);
    
    if (!question) {
      errors.push(`Invalid question ID: ${questionId}`);
      continue;
    }
    
    // Skip empty optional answers
    if (!question.required && (answer === undefined || answer === null || answer === '')) {
      continue;
    }
    
    // Type-specific validation
    switch (question.type) {
      case 'single_choice':
        if (typeof answer !== 'string') {
          errors.push(`Question "${question.label}" must be a string`);
        } else {
          // Validate against options if available
          const options = questions.filter(q => q.id === qId).map(q => q.options).flat().filter(Boolean);
          if (options.length > 0 && !options.some(opt => opt && opt.value === answer)) {
            errors.push(`Invalid option for question "${question.label}": ${answer}`);
          }
        }
        break;
      
      case 'multi_choice':
        if (!Array.isArray(answer)) {
          errors.push(`Question "${question.label}" must be an array`);
        } else {
          // Validate each option
          const options = questions.filter(q => q.id === qId).map(q => q.options).flat().filter(Boolean);
          if (options.length > 0) {
            for (const selectedOption of (answer as string[])) {
              if (!options.some(opt => opt?.value === selectedOption)) {
                errors.push(`Invalid option for question "${question.label}": ${selectedOption}`);
              }
            }
          }
        }
        break;
      
      case 'number':
      case 'rating':
        if (typeof answer !== 'number' || isNaN(answer as number)) {
          errors.push(`Question "${question.label}" must be a valid number`);
        }
        // Check validation rules if present
        if (question.validation) {
          const validation = typeof question.validation === 'string' ? JSON.parse(question.validation) : question.validation;
          if (validation.min !== undefined && (answer as number) < validation.min) {
            errors.push(`Question "${question.label}" must be at least ${validation.min}`);
          }
          if (validation.max !== undefined && (answer as number) > validation.max) {
            errors.push(`Question "${question.label}" must be at most ${validation.max}`);
          }
        }
        break;
      
      case 'boolean':
        if (typeof answer !== 'boolean') {
          errors.push(`Question "${question.label}" must be true or false`);
        }
        break;
      
      case 'text':
      case 'textarea':
        if (typeof answer !== 'string') {
          errors.push(`Question "${question.label}" must be a string`);
        } else {
          // Check validation rules if present
          if (question.validation) {
            const validation = typeof question.validation === 'string' ? JSON.parse(question.validation) : question.validation;
            if (validation.minLength !== undefined && (answer as string).length < validation.minLength) {
              errors.push(`Question "${question.label}" must be at least ${validation.minLength} characters`);
            }
            if (validation.maxLength !== undefined && (answer as string).length > validation.maxLength) {
              errors.push(`Question "${question.label}" must be at most ${validation.maxLength} characters`);
            }
          }
        }
        break;
      
      case 'date':
        // Accept both Date objects and ISO date strings
        if (typeof answer === 'string') {
          const parsedDate = new Date(answer as string);
          if (isNaN(parsedDate.getTime())) {
            errors.push(`Question "${question.label}" must be a valid date`);
          }
        } else if (!(answer instanceof Date)) {
          errors.push(`Question "${question.label}" must be a valid date`);
        }
        break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper function to process answers for storage with proper typing
function processAnswerForStorage(answer: any, questionType: string): {
  answer: any;
  answerText: string | null;
  answerNumber: number | null;
  answerBoolean: boolean | null;
  answerDate: Date | null;
} {
  let answerText: string | null = null;
  let answerNumber: number | null = null;
  let answerBoolean: boolean | null = null;
  let answerDate: Date | null = null;
  
  // Process based on question type
  switch (questionType) {
    case 'text':
    case 'textarea':
    case 'single_choice':
      answerText = String(answer);
      break;
    
    case 'multi_choice':
      if (Array.isArray(answer)) {
        answerText = JSON.stringify(answer);
      } else {
        answerText = String(answer);
      }
      break;
    
    case 'number':
    case 'rating':
      answerNumber = Number(answer);
      break;
    
    case 'boolean':
      answerBoolean = Boolean(answer);
      break;
    
    case 'date':
      if (typeof answer === 'string') {
        answerDate = new Date(answer);
      } else if (answer instanceof Date) {
        answerDate = answer;
      }
      break;
  }
  
  return {
    answer,
    answerText,
    answerNumber,
    answerBoolean,
    answerDate
  };
}

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

  // ===== CAREGIVER SURVEY ACCESS ROUTES =====
  
  // Get pending surveys for a caregiver
  app.get("/api/caregiver/surveys/pending", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const pendingSurveys = await storage.getPendingSurveysByCaregiver(caregiver.id);
      res.json(pendingSurveys);
    } catch (error) {
      console.error("Error fetching pending surveys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get survey details for assignment
  app.get("/api/caregiver/surveys/:assignmentId", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const assignmentId = parseInt(req.params.assignmentId);
      
      // Verify assignment belongs to this caregiver
      const assignment = await storage.getSurveyAssignment(assignmentId);
      if (!assignment || assignment.caregiverId !== caregiver.id) {
        return res.status(403).json({ message: "Survey assignment not found or access denied" });
      }
      
      // Get survey with questions and options
      const surveyDetails = await storage.getSurveyWithQuestions(assignment.surveyId);
      if (!surveyDetails) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      res.json({
        assignment,
        survey: surveyDetails
      });
    } catch (error) {
      console.error("Error fetching survey details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Submit survey response
  app.post("/api/caregiver/surveys/:assignmentId/submit", isCaregiver, async (req, res) => {
    try {
      const caregiver = (req as any).caregiver;
      const assignmentId = parseInt(req.params.assignmentId);
      const { answers, meta } = req.body;
      
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ message: "Answers are required and must be an object" });
      }

      // Verify assignment belongs to this caregiver
      const assignment = await storage.getSurveyAssignment(assignmentId);
      if (!assignment || assignment.caregiverId !== caregiver.id) {
        return res.status(403).json({ message: "Survey assignment not found or access denied" });
      }
      
      if (assignment.status === 'completed') {
        return res.status(400).json({ message: "Survey has already been submitted" });
      }

      // Check assignment expiry
      if (assignment.dueAt && new Date() > assignment.dueAt) {
        return res.status(400).json({ message: "Survey assignment has expired" });
      }
      
      // Get survey with questions for validation
      const surveyDetails = await storage.getSurveyWithQuestions(assignment.surveyId);
      if (!surveyDetails) {
        return res.status(404).json({ message: "Survey not found" });
      }

      // Validate survey is published
      if (surveyDetails.survey.status !== 'published') {
        return res.status(400).json({ message: "Survey is not available for submission" });
      }
      
      // Validate answers against survey questions
      const validationResult = validateSurveyAnswers(answers, surveyDetails.questions);
      if (!validationResult.isValid) {
        return res.status(400).json({ 
          message: "Invalid survey answers",
          errors: validationResult.errors 
        });
      }
      
      // Use database transaction for atomic operations
      const result = await db.transaction(async (tx) => {
        // Create survey response
        const responseData = insertSurveyResponseV2Schema.parse({
          surveyId: assignment.surveyId,
          assignmentId: assignmentId,
          checkInId: assignment.checkInId,
          caregiverId: caregiver.id,
          patientId: assignment.patientId,
          meta: meta || {}
        });
        
        const [surveyResponse] = await tx
          .insert(surveyResponsesV2)
          .values(responseData)
          .returning();
        
        // Process and validate response items
        const responseItems = [];
        for (const [questionId, answer] of Object.entries(answers)) {
          const qId = parseInt(questionId);
          
          // Validate question exists
          const question = surveyDetails.questions.find((q: any) => q.id === qId);
          if (!question) {
            throw new Error(`Question ID ${qId} not found in survey`);
          }

          const processedItem = processAnswerForStorage(answer, question.type);
          const item = {
            responseId: surveyResponse.id,
            questionId: qId,
            answer: processedItem.answer,
            answerText: processedItem.answerText,
            answerNumber: processedItem.answerNumber,
            answerBoolean: processedItem.answerBoolean,
            answerDate: processedItem.answerDate
          };
          responseItems.push(item);
        }
        
        // Insert response items
        if (responseItems.length > 0) {
          await tx
            .insert(surveyResponseItems)
            .values(responseItems);
        }
        
        // Mark assignment as completed
        await tx
          .update(surveyAssignments)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(surveyAssignments.id, assignmentId));
        
        // If linked to a check-in, mark check-in as completed
        if (assignment.checkInId) {
          await tx
            .update(weeklyCheckIns)
            .set({ isCompleted: true, completedAt: new Date() })
            .where(eq(weeklyCheckIns.id, assignment.checkInId));
        }
        
        return surveyResponse;
      });
      
      res.json({ 
        message: "Survey submitted successfully", 
        response: result 
      });
    } catch (error: unknown) {
      console.error("Error submitting survey:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
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

  // ===== ADMIN SURVEY MANAGEMENT ROUTES =====
  
  // Survey CRUD Operations
  app.get("/api/admin/surveys", isAuthenticated, async (req, res) => {
    try {
      const surveys = await storage.getAllSurveys();
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const survey = await storage.getSurveyWithQuestions(surveyId);
      
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      res.json(survey);
    } catch (error) {
      console.error("Error fetching survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/surveys", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const validatedData = insertSurveySchema.parse({
        ...req.body,
        createdBy: userId
      });
      
      const survey = await storage.createSurvey(validatedData);
      res.json(survey);
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated via this endpoint
      delete updates.id;
      delete updates.createdBy;
      delete updates.createdAt;
      
      const survey = await storage.updateSurvey(surveyId, updates);
      res.json(survey);
    } catch (error) {
      console.error("Error updating survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/surveys/:id", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      await storage.deleteSurvey(surveyId);
      res.json({ message: "Survey deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Survey Status Management
  app.post("/api/admin/surveys/:id/publish", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      await storage.publishSurvey(surveyId);
      res.json({ message: "Survey published successfully" });
    } catch (error) {
      console.error("Error publishing survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/surveys/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      await storage.archiveSurvey(surveyId);
      res.json({ message: "Survey archived successfully" });
    } catch (error) {
      console.error("Error archiving survey:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Survey Question CRUD Operations
  app.get("/api/admin/surveys/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const questions = await storage.getSurveyQuestions(surveyId);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching survey questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/surveys/:id/questions", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const validatedData = insertSurveyQuestionSchema.parse({
        ...req.body,
        surveyId
      });
      
      const question = await storage.createSurveyQuestion(validatedData);
      res.json(question);
    } catch (error) {
      console.error("Error creating survey question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.createdAt;
      
      const question = await storage.updateSurveyQuestion(questionId, updates);
      res.json(question);
    } catch (error) {
      console.error("Error updating survey question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/questions/:id", isAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      await storage.deleteSurveyQuestion(questionId);
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting survey question:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Question Reordering
  app.post("/api/admin/questions/reorder", isAuthenticated, async (req, res) => {
    try {
      const { questionIds } = req.body;
      
      if (!Array.isArray(questionIds)) {
        return res.status(400).json({ message: "questionIds must be an array" });
      }
      
      await storage.reorderSurveyQuestions(questionIds);
      res.json({ message: "Questions reordered successfully" });
    } catch (error) {
      console.error("Error reordering questions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Survey Option CRUD Operations
  app.get("/api/admin/questions/:id/options", isAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const options = await storage.getSurveyOptions(questionId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching question options:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/questions/:id/options", isAuthenticated, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const validatedData = insertSurveyOptionSchema.parse({
        ...req.body,
        questionId
      });
      
      const option = await storage.createSurveyOption(validatedData);
      res.json(option);
    } catch (error) {
      console.error("Error creating question option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/options/:id", isAuthenticated, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.createdAt;
      
      const option = await storage.updateSurveyOption(optionId, updates);
      res.json(option);
    } catch (error) {
      console.error("Error updating question option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/options/:id", isAuthenticated, async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      await storage.deleteSurveyOption(optionId);
      res.json({ message: "Option deleted successfully" });
    } catch (error) {
      console.error("Error deleting question option:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Survey Assignment Operations
  app.post("/api/admin/surveys/:id/assign", isAuthenticated, async (req, res) => {
    try {
      const surveyId = parseInt(req.params.id);
      const { caregiverId, patientId, dueAt } = req.body;
      
      if (!caregiverId) {
        return res.status(400).json({ message: "caregiverId is required" });
      }
      
      const assignment = await storage.assignSurveyToCaregiver(
        surveyId, 
        caregiverId, 
        patientId, 
        dueAt ? new Date(dueAt) : undefined
      );
      
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning survey:", error);
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
    } catch (error: unknown) {
      console.error("Error creating caregiver:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Internal server error", error: errorMessage });
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
    } catch (error: unknown) {
      console.error("Error creating patient:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: "Internal server error", error: errorMessage });
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
