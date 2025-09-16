import { 
  users,
  caregivers, 
  patients, 
  weeklyCheckIns, 
  surveyResponses,
  surveys,
  surveyQuestions,
  surveyOptions,
  surveyAssignments,
  surveyResponsesV2,
  surveyResponseItems,
  surveyStateTags,
  surveySchedules,
  type User,
  type UpsertUser,
  type Caregiver, 
  type InsertCaregiver,
  type Patient,
  type InsertPatient,
  type WeeklyCheckIn,
  type InsertWeeklyCheckIn,
  type SurveyResponse,
  type InsertSurveyResponse,
  type Survey,
  type InsertSurvey,
  type SurveyQuestion,
  type InsertSurveyQuestion,
  type SurveyOption,
  type InsertSurveyOption,
  type SurveyAssignment,
  type InsertSurveyAssignment,
  type SurveyResponseV2,
  type InsertSurveyResponseV2,
  type SurveyResponseItem,
  type InsertSurveyResponseItem,
  type SurveyStateTag,
  type InsertSurveyStateTag,
  type SurveySchedule,
  type InsertSurveySchedule,
  type StateCode
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Caregiver methods
  getCaregiver(id: number): Promise<Caregiver | undefined>;
  getCaregiverByPhone(phone: string): Promise<Caregiver | undefined>;
  getCaregiverByPhoneAndState(phone: string, state: string): Promise<Caregiver | undefined>;
  getCaregiversByState(state: string): Promise<Caregiver[]>;
  createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver>;
  updateCaregiverPassword(id: number, password: string): Promise<void>;
  getAllCaregivers(): Promise<Caregiver[]>;
  deleteCaregiver(id: number): Promise<void>;
  
  // Patient methods
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientsByCaregiver(caregiverId: number): Promise<Patient[]>;
  getAllPatients(): Promise<Patient[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  
  // Weekly check-in methods
  getWeeklyCheckIn(id: number): Promise<WeeklyCheckIn | undefined>;
  getWeeklyCheckInWithDetails(id: number): Promise<any>;
  createWeeklyCheckIn(checkIn: InsertWeeklyCheckIn): Promise<WeeklyCheckIn>;
  getCheckInsForWeek(weekStart: Date, weekEnd: Date): Promise<any[]>;
  getPendingCheckIns(): Promise<any[]>;
  updateCheckInCompletion(id: number): Promise<void>;
  
  // Survey response methods
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  getSurveyResponsesByCheckIn(checkInId: number): Promise<SurveyResponse[]>;
  getCaregiverPreviousResponses(caregiverId: number, patientId: number): Promise<SurveyResponse | undefined>;
  
  // Dashboard stats
  getDashboardStats(): Promise<any>;
  getRecentResponses(limit?: number): Promise<any[]>;
  
  // Dynamic Survey methods
  // Survey CRUD
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  getSurvey(id: number): Promise<Survey | undefined>;
  getSurveyWithQuestions(id: number): Promise<any>;
  getAllSurveys(): Promise<Survey[]>;
  getAllSurveysPaginated(page: number, limit: number): Promise<{
    surveys: Survey[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }>;
  updateSurvey(id: number, updates: Partial<InsertSurvey>): Promise<Survey>;
  deleteSurvey(id: number): Promise<void>;
  publishSurvey(id: number): Promise<void>;
  archiveSurvey(id: number): Promise<void>;
  
  // Survey Question CRUD
  createSurveyQuestion(question: InsertSurveyQuestion): Promise<SurveyQuestion>;
  getSurveyQuestion(id: number): Promise<SurveyQuestion | undefined>;
  getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]>;
  updateSurveyQuestion(id: number, updates: Partial<InsertSurveyQuestion>): Promise<SurveyQuestion>;
  deleteSurveyQuestion(id: number): Promise<void>;
  reorderSurveyQuestions(questionIds: number[]): Promise<void>;
  
  // Survey Option CRUD
  createSurveyOption(option: InsertSurveyOption): Promise<SurveyOption>;
  getSurveyOptions(questionId: number): Promise<SurveyOption[]>;
  updateSurveyOption(id: number, updates: Partial<InsertSurveyOption>): Promise<SurveyOption>;
  deleteSurveyOption(id: number): Promise<void>;
  
  // Survey Assignment methods
  createSurveyAssignment(assignment: InsertSurveyAssignment): Promise<SurveyAssignment>;
  getSurveyAssignment(id: number): Promise<SurveyAssignment | undefined>;
  getPendingSurveysByCaregiver(caregiverId: number): Promise<any[]>;
  assignSurveyToCaregiver(surveyId: number, caregiverId: number, patientId?: number, dueAt?: Date): Promise<SurveyAssignment>;
  completeSurveyAssignment(id: number): Promise<void>;
  
  // Survey Response V2 methods
  createSurveyResponseV2(response: InsertSurveyResponseV2): Promise<SurveyResponseV2>;
  getSurveyResponseV2(id: number): Promise<SurveyResponseV2 | undefined>;
  getSurveyResponsesByAssignment(assignmentId: number): Promise<SurveyResponseV2[]>;
  
  // Survey Response Item methods
  createSurveyResponseItem(item: InsertSurveyResponseItem): Promise<SurveyResponseItem>;
  getSurveyResponseItems(responseId: number): Promise<SurveyResponseItem[]>;
  bulkCreateSurveyResponseItems(items: InsertSurveyResponseItem[]): Promise<SurveyResponseItem[]>;

  // Survey State Tag methods
  getSurveyStates(surveyId: number): Promise<StateCode[]>;
  setSurveyStates(surveyId: number, states: StateCode[]): Promise<void>;
  getAllSurveysWithStates(): Promise<Array<Survey & { states: StateCode[] }>>;

  // Survey Schedule methods
  createSurveySchedule(schedule: InsertSurveySchedule): Promise<SurveySchedule>;
  getSurveySchedule(id: number): Promise<SurveySchedule | undefined>;
  getSurveySchedules(surveyId: number): Promise<SurveySchedule[]>;
  getAllSchedules(): Promise<SurveySchedule[]>;
  getAllActiveSchedules(): Promise<SurveySchedule[]>;
  getSchedulesDueToRun(currentTime: Date): Promise<SurveySchedule[]>;
  updateSurveySchedule(id: number, updates: Partial<InsertSurveySchedule>): Promise<SurveySchedule>;
  updateScheduleRunTimes(id: number, lastRun: Date, nextRun: Date | null): Promise<void>;
  deleteSurveySchedule(id: number): Promise<void>;
  toggleScheduleActive(id: number, isActive: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCaregiver(id: number): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.id, id));
    return caregiver || undefined;
  }

  async getCaregiverByPhone(phone: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.phone, phone));
    return caregiver || undefined;
  }

  async getCaregiverByPhoneAndState(phone: string, state: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(
      and(eq(caregivers.phone, phone), eq(caregivers.state, state))
    );
    return caregiver || undefined;
  }

  async getCaregiversByState(state: string): Promise<Caregiver[]> {
    return await db.select().from(caregivers).where(
      and(eq(caregivers.state, state), eq(caregivers.isActive, true))
    );
  }

  async updateCaregiverPassword(id: number, password: string): Promise<void> {
    await db
      .update(caregivers)
      .set({ password })
      .where(eq(caregivers.id, id));
  }

  async updateCaregiverProfile(id: number, data: { name: string; email?: string | null; emergencyContact?: string | null }): Promise<void> {
    await db
      .update(caregivers)
      .set({
        name: data.name,
        email: data.email,
        emergencyContact: data.emergencyContact,
      })
      .where(eq(caregivers.id, id));
  }

  async createCaregiver(insertCaregiver: InsertCaregiver): Promise<Caregiver> {
    const [caregiver] = await db
      .insert(caregivers)
      .values(insertCaregiver)
      .returning();
    return caregiver;
  }

  async getAllCaregivers(): Promise<Caregiver[]> {
    return await db.select({
      id: caregivers.id,
      name: caregivers.name,
      phone: caregivers.phone,
      email: caregivers.email,
      address: caregivers.address,
      emergencyContact: caregivers.emergencyContact,
      state: caregivers.state,
      password: caregivers.password,
      isActive: caregivers.isActive,
      createdAt: caregivers.createdAt,
    }).from(caregivers).where(eq(caregivers.isActive, true));
  }

  async deleteCaregiver(id: number): Promise<void> {
    // Check if caregiver has associated patients
    const associatedPatients = await db.select().from(patients).where(eq(patients.caregiverId, id));
    
    if (associatedPatients.length > 0) {
      throw new Error(`Cannot delete caregiver. ${associatedPatients.length} patient(s) are still assigned to this caregiver. Please reassign or remove patients first.`);
    }
    
    // Check if caregiver has associated weekly check-ins
    const associatedCheckIns = await db.select().from(weeklyCheckIns).where(eq(weeklyCheckIns.caregiverId, id));
    
    if (associatedCheckIns.length > 0) {
      throw new Error(`Cannot delete caregiver. ${associatedCheckIns.length} weekly check-in(s) are associated with this caregiver. Please remove check-ins first.`);
    }
    
    await db.delete(caregivers).where(eq(caregivers.id, id));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient || undefined;
  }

  async getPatientsByCaregiver(caregiverId: number): Promise<Patient[]> {
    return await db.select().from(patients).where(
      and(eq(patients.caregiverId, caregiverId), eq(patients.isActive, true))
    );
  }

  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).where(eq(patients.isActive, true));
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db
      .insert(patients)
      .values(insertPatient)
      .returning();
    return patient;
  }

  async getWeeklyCheckIn(id: number): Promise<WeeklyCheckIn | undefined> {
    const [checkIn] = await db.select().from(weeklyCheckIns).where(eq(weeklyCheckIns.id, id));
    return checkIn || undefined;
  }

  async getWeeklyCheckInWithDetails(id: number): Promise<any> {
    const result = await db
      .select({
        checkIn: weeklyCheckIns,
        caregiver: caregivers,
        patient: patients,
        response: surveyResponses,
      })
      .from(weeklyCheckIns)
      .leftJoin(caregivers, eq(weeklyCheckIns.caregiverId, caregivers.id))
      .leftJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
      .leftJoin(surveyResponses, eq(weeklyCheckIns.id, surveyResponses.checkInId))
      .where(eq(weeklyCheckIns.id, id));

    return result[0] || undefined;
  }

  async createWeeklyCheckIn(insertCheckIn: InsertWeeklyCheckIn): Promise<WeeklyCheckIn> {
    const [checkIn] = await db
      .insert(weeklyCheckIns)
      .values(insertCheckIn)
      .returning();
    return checkIn;
  }

  async getCheckInsForWeek(weekStart: Date, weekEnd: Date): Promise<any[]> {
    return await db
      .select({
        checkIn: weeklyCheckIns,
        caregiver: caregivers,
        patient: patients,
        response: surveyResponses,
      })
      .from(weeklyCheckIns)
      .leftJoin(caregivers, eq(weeklyCheckIns.caregiverId, caregivers.id))
      .leftJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
      .leftJoin(surveyResponses, eq(weeklyCheckIns.id, surveyResponses.checkInId))
      .where(
        and(
          gte(weeklyCheckIns.weekStartDate, weekStart),
          lte(weeklyCheckIns.weekEndDate, weekEnd)
        )
      )
      .orderBy(desc(weeklyCheckIns.weekStartDate));
  }

  async getPendingCheckIns(): Promise<any[]> {
    return await db
      .select({
        checkIn: weeklyCheckIns,
        caregiver: caregivers,
        patient: patients,
      })
      .from(weeklyCheckIns)
      .leftJoin(caregivers, eq(weeklyCheckIns.caregiverId, caregivers.id))
      .leftJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
      .where(eq(weeklyCheckIns.isCompleted, false))
      .orderBy(desc(weeklyCheckIns.weekStartDate));
  }

  async updateCheckInCompletion(id: number): Promise<void> {
    await db
      .update(weeklyCheckIns)
      .set({ isCompleted: true, completedAt: new Date() })
      .where(eq(weeklyCheckIns.id, id));
  }

  async getPendingCheckInsByCaregiver(caregiverId: number) {
    try {
      const result = await db
        .select({
          id: weeklyCheckIns.id,
          patientId: weeklyCheckIns.patientId,
          patientName: patients.name,
          weekStartDate: weeklyCheckIns.weekStartDate,
          weekEndDate: weeklyCheckIns.weekEndDate,
          status: sql<string>`CASE 
            WHEN ${weeklyCheckIns.isCompleted} = true THEN 'completed'
            WHEN ${weeklyCheckIns.weekEndDate} < CURRENT_DATE THEN 'overdue'
            ELSE 'pending'
          END`,
          dueDate: weeklyCheckIns.weekEndDate,
        })
        .from(weeklyCheckIns)
        .innerJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
        .where(
          and(
            eq(weeklyCheckIns.caregiverId, caregiverId),
            eq(weeklyCheckIns.isCompleted, false)
          )
        )
        .orderBy(weeklyCheckIns.weekStartDate);

      return result;
    } catch (error) {
      console.error("Error in getPendingCheckInsByCaregiver:", error);
      throw error;
    }
  }

  async getCompletedCheckInsByCaregiver(caregiverId: number, limit: number = 20) {
    try {
      const result = await db
        .select({
          id: weeklyCheckIns.id, // Return check-in ID for navigation
          patientId: weeklyCheckIns.patientId,
          patientName: patients.name,
          completedAt: surveyResponses.submittedAt,
          weekStartDate: weeklyCheckIns.weekStartDate,
          weekEndDate: weeklyCheckIns.weekEndDate,
          hasHealthConcerns: sql<boolean>`${surveyResponses.mentalHealth} = true OR ${surveyResponses.physicalHealth} = true`,
          hasSafetyConcerns: sql<boolean>`${surveyResponses.hospitalVisits} = true OR ${surveyResponses.accidentsFalls} = true`,
        })
        .from(surveyResponses)
        .innerJoin(weeklyCheckIns, eq(surveyResponses.checkInId, weeklyCheckIns.id))
        .innerJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
        .where(eq(weeklyCheckIns.caregiverId, caregiverId))
        .orderBy(desc(surveyResponses.submittedAt))
        .limit(limit);

      return result;
    } catch (error) {
      console.error("Error in getCompletedCheckInsByCaregiver:", error);
      throw error;
    }
  }

  async createSurveyResponse(insertResponse: InsertSurveyResponse): Promise<SurveyResponse> {
    const [response] = await db
      .insert(surveyResponses)
      .values(insertResponse)
      .returning();
    return response;
  }

  async getSurveyResponsesByCheckIn(checkInId: number): Promise<SurveyResponse[]> {
    return await db.select().from(surveyResponses).where(eq(surveyResponses.checkInId, checkInId));
  }

  async getCaregiverPreviousResponses(caregiverId: number, patientId: number): Promise<SurveyResponse | undefined> {
    const result = await db
      .select({ response: surveyResponses })
      .from(surveyResponses)
      .innerJoin(weeklyCheckIns, eq(surveyResponses.checkInId, weeklyCheckIns.id))
      .where(
        and(
          eq(weeklyCheckIns.caregiverId, caregiverId),
          eq(weeklyCheckIns.patientId, patientId),
          eq(weeklyCheckIns.isCompleted, true)
        )
      )
      .orderBy(desc(surveyResponses.submittedAt))
      .limit(1);

    return result[0]?.response;
  }

  async getDashboardStats(): Promise<any> {
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    // Get total caregivers
    const totalCaregivers = await db
      .select({ count: sql<number>`count(*)` })
      .from(caregivers)
      .where(eq(caregivers.isActive, true));

    // Get this week's responses
    const thisWeekCheckIns = await db
      .select({ 
        total: sql<number>`count(*)`,
        completed: sql<number>`count(case when ${weeklyCheckIns.isCompleted} = true then 1 end)`
      })
      .from(weeklyCheckIns)
      .where(
        and(
          gte(weeklyCheckIns.weekStartDate, currentWeekStart),
          lte(weeklyCheckIns.weekEndDate, currentWeekEnd)
        )
      );

    // Get pending responses
    const pendingResponses = await db
      .select({ count: sql<number>`count(*)` })
      .from(weeklyCheckIns)
      .where(eq(weeklyCheckIns.isCompleted, false));

    // Get health issues (responses with 'yes' to health questions)
    const healthIssues = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .innerJoin(weeklyCheckIns, eq(surveyResponses.checkInId, weeklyCheckIns.id))
      .where(
        and(
          gte(weeklyCheckIns.weekStartDate, currentWeekStart),
          lte(weeklyCheckIns.weekEndDate, currentWeekEnd),
          sql`(${surveyResponses.hospitalVisits} = true OR ${surveyResponses.accidentsFalls} = true OR ${surveyResponses.mentalHealth} = true OR ${surveyResponses.physicalHealth} = true)`
        )
      );

    return {
      totalCaregivers: totalCaregivers[0]?.count || 0,
      thisWeekTotal: thisWeekCheckIns[0]?.total || 0,
      thisWeekCompleted: thisWeekCheckIns[0]?.completed || 0,
      pendingResponses: pendingResponses[0]?.count || 0,
      healthIssues: healthIssues[0]?.count || 0,
    };
  }

  async getRecentResponses(limit: number = 10): Promise<any[]> {
    return await db
      .select({
        checkIn: {
          id: weeklyCheckIns.id,
          caregiverId: weeklyCheckIns.caregiverId,
          patientId: weeklyCheckIns.patientId,
          weekStartDate: weeklyCheckIns.weekStartDate,
          weekEndDate: weeklyCheckIns.weekEndDate,
          isCompleted: weeklyCheckIns.isCompleted,
          completedAt: weeklyCheckIns.completedAt,
          remindersSent: weeklyCheckIns.remindersSent,
          lastReminderAt: weeklyCheckIns.lastReminderAt,
          createdAt: weeklyCheckIns.createdAt,
        },
        caregiver: caregivers,
        patient: patients,
        response: surveyResponses,
      })
      .from(weeklyCheckIns)
      .leftJoin(caregivers, eq(weeklyCheckIns.caregiverId, caregivers.id))
      .leftJoin(patients, eq(weeklyCheckIns.patientId, patients.id))
      .leftJoin(surveyResponses, eq(weeklyCheckIns.id, surveyResponses.checkInId))
      .orderBy(desc(weeklyCheckIns.createdAt))
      .limit(limit);
  }

  // Dynamic Survey Storage Methods
  
  // Survey CRUD
  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(insertSurvey)
      .returning();
    return survey;
  }

  async getSurvey(id: number): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async getSurveyWithQuestions(id: number): Promise<any> {
    const result = await db
      .select({
        survey: surveys,
        question: surveyQuestions,
        option: surveyOptions,
      })
      .from(surveys)
      .leftJoin(surveyQuestions, eq(surveys.id, surveyQuestions.surveyId))
      .leftJoin(surveyOptions, eq(surveyQuestions.id, surveyOptions.questionId))
      .where(eq(surveys.id, id))
      .orderBy(surveyQuestions.order, surveyOptions.order);

    if (!result[0]) return undefined;

    const survey = result[0].survey;
    const questionsMap = new Map();

    result.forEach(row => {
      if (row.question) {
        if (!questionsMap.has(row.question.id)) {
          questionsMap.set(row.question.id, {
            ...row.question,
            options: []
          });
        }
        if (row.option) {
          questionsMap.get(row.question.id).options.push(row.option);
        }
      }
    });

    return {
      ...survey,
      questions: Array.from(questionsMap.values())
    };
  }

  async getAllSurveys(): Promise<Survey[]> {
    return await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  }

  async getAllSurveysPaginated(page: number = 1, limit: number = 10): Promise<{
    surveys: Survey[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const offset = (page - 1) * limit;
    
    // Get total count for pagination metadata
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveys);
    
    // Get paginated surveys
    const paginatedSurveys = await db
      .select()
      .from(surveys)
      .orderBy(desc(surveys.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);
    
    return {
      surveys: paginatedSurveys,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async updateSurvey(id: number, updates: Partial<InsertSurvey>): Promise<Survey> {
    const [survey] = await db
      .update(surveys)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(surveys.id, id))
      .returning();
    return survey;
  }

  async deleteSurvey(id: number): Promise<void> {
    // Delete in correct order to handle all foreign key constraints
    
    // 1. Get all question IDs for this survey
    const surveyQuestionIds = await db
      .select({ id: surveyQuestions.id })
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, id));
    
    // 2. Delete survey response items (through questions)
    for (const question of surveyQuestionIds) {
      await db.delete(surveyResponseItems).where(eq(surveyResponseItems.questionId, question.id));
    }
    
    // 3. Delete survey responses v2
    await db.delete(surveyResponsesV2).where(eq(surveyResponsesV2.surveyId, id));
    
    // 4. Delete survey assignments
    await db.delete(surveyAssignments).where(eq(surveyAssignments.surveyId, id));
    
    // 5. Delete survey schedules
    await db.delete(surveySchedules).where(eq(surveySchedules.surveyId, id));
    
    // 6. Delete survey state tags
    await db.delete(surveyStateTags).where(eq(surveyStateTags.surveyId, id));
    
    // 7. Delete survey options (through questions)
    for (const question of surveyQuestionIds) {
      await db.delete(surveyOptions).where(eq(surveyOptions.questionId, question.id));
    }
    
    // 8. Delete survey questions
    await db.delete(surveyQuestions).where(eq(surveyQuestions.surveyId, id));
    
    // 9. Finally delete the survey itself
    await db.delete(surveys).where(eq(surveys.id, id));
  }

  async publishSurvey(id: number): Promise<void> {
    await db
      .update(surveys)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(surveys.id, id));
  }

  async archiveSurvey(id: number): Promise<void> {
    await db
      .update(surveys)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(surveys.id, id));
  }

  // Survey Question CRUD
  async createSurveyQuestion(insertQuestion: InsertSurveyQuestion): Promise<SurveyQuestion> {
    const [question] = await db
      .insert(surveyQuestions)
      .values(insertQuestion)
      .returning();
    return question;
  }

  async getSurveyQuestion(id: number): Promise<SurveyQuestion | undefined> {
    const [question] = await db.select().from(surveyQuestions).where(eq(surveyQuestions.id, id));
    return question || undefined;
  }

  async getSurveyQuestions(surveyId: number): Promise<SurveyQuestion[]> {
    return await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.order);
  }

  async updateSurveyQuestion(id: number, updates: Partial<InsertSurveyQuestion>): Promise<SurveyQuestion> {
    const [question] = await db
      .update(surveyQuestions)
      .set(updates)
      .where(eq(surveyQuestions.id, id))
      .returning();
    return question;
  }

  async deleteSurveyQuestion(id: number): Promise<void> {
    await db.delete(surveyQuestions).where(eq(surveyQuestions.id, id));
  }

  async reorderSurveyQuestions(questionIds: number[]): Promise<void> {
    for (let i = 0; i < questionIds.length; i++) {
      await db
        .update(surveyQuestions)
        .set({ order: i + 1 })
        .where(eq(surveyQuestions.id, questionIds[i]));
    }
  }

  // Survey Option CRUD
  async createSurveyOption(insertOption: InsertSurveyOption): Promise<SurveyOption> {
    const [option] = await db
      .insert(surveyOptions)
      .values(insertOption)
      .returning();
    return option;
  }

  async getSurveyOptions(questionId: number): Promise<SurveyOption[]> {
    return await db
      .select()
      .from(surveyOptions)
      .where(eq(surveyOptions.questionId, questionId))
      .orderBy(surveyOptions.order);
  }

  async updateSurveyOption(id: number, updates: Partial<InsertSurveyOption>): Promise<SurveyOption> {
    const [option] = await db
      .update(surveyOptions)
      .set(updates)
      .where(eq(surveyOptions.id, id))
      .returning();
    return option;
  }

  async deleteSurveyOption(id: number): Promise<void> {
    await db.delete(surveyOptions).where(eq(surveyOptions.id, id));
  }

  // Survey Assignment methods
  async createSurveyAssignment(insertAssignment: InsertSurveyAssignment): Promise<SurveyAssignment> {
    const [assignment] = await db
      .insert(surveyAssignments)
      .values(insertAssignment)
      .returning();
    return assignment;
  }

  async getSurveyAssignment(id: number): Promise<SurveyAssignment | undefined> {
    const [assignment] = await db.select().from(surveyAssignments).where(eq(surveyAssignments.id, id));
    return assignment || undefined;
  }

  async getPendingSurveysByCaregiver(caregiverId: number): Promise<any[]> {
    return await db
      .select({
        assignment: surveyAssignments,
        survey: surveys,
        patient: patients,
      })
      .from(surveyAssignments)
      .leftJoin(surveys, eq(surveyAssignments.surveyId, surveys.id))
      .leftJoin(patients, eq(surveyAssignments.patientId, patients.id))
      .where(
        and(
          eq(surveyAssignments.caregiverId, caregiverId),
          eq(surveyAssignments.status, 'pending')
        )
      )
      .orderBy(surveyAssignments.dueAt);
  }

  async assignSurveyToCaregiver(surveyId: number, caregiverId: number, patientId?: number, dueAt?: Date): Promise<SurveyAssignment> {
    const [assignment] = await db
      .insert(surveyAssignments)
      .values({
        surveyId,
        caregiverId,
        patientId,
        dueAt,
        status: 'pending'
      })
      .returning();
    return assignment;
  }

  async completeSurveyAssignment(id: number): Promise<void> {
    await db
      .update(surveyAssignments)
      .set({ status: 'completed', completedAt: new Date() })
      .where(eq(surveyAssignments.id, id));
  }

  // Survey Response V2 methods
  async createSurveyResponseV2(insertResponse: InsertSurveyResponseV2): Promise<SurveyResponseV2> {
    const [response] = await db
      .insert(surveyResponsesV2)
      .values(insertResponse)
      .returning();
    return response;
  }

  async getSurveyResponseV2(id: number): Promise<SurveyResponseV2 | undefined> {
    const [response] = await db.select().from(surveyResponsesV2).where(eq(surveyResponsesV2.id, id));
    return response || undefined;
  }

  async getSurveyResponsesByAssignment(assignmentId: number): Promise<SurveyResponseV2[]> {
    return await db
      .select()
      .from(surveyResponsesV2)
      .where(eq(surveyResponsesV2.assignmentId, assignmentId));
  }

  // Survey Response Item methods
  async createSurveyResponseItem(insertItem: InsertSurveyResponseItem): Promise<SurveyResponseItem> {
    const [item] = await db
      .insert(surveyResponseItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async getSurveyResponseItems(responseId: number): Promise<SurveyResponseItem[]> {
    return await db
      .select()
      .from(surveyResponseItems)
      .where(eq(surveyResponseItems.responseId, responseId));
  }

  async bulkCreateSurveyResponseItems(insertItems: InsertSurveyResponseItem[]): Promise<SurveyResponseItem[]> {
    const items = await db
      .insert(surveyResponseItems)
      .values(insertItems)
      .returning();
    return items;
  }

  // Survey State Tag methods
  async getSurveyStates(surveyId: number): Promise<StateCode[]> {
    const stateTags = await db
      .select({ stateCode: surveyStateTags.stateCode })
      .from(surveyStateTags)
      .where(eq(surveyStateTags.surveyId, surveyId));
    
    return stateTags.map(tag => tag.stateCode as StateCode);
  }

  async setSurveyStates(surveyId: number, states: StateCode[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete existing state tags for this survey
      await tx.delete(surveyStateTags).where(eq(surveyStateTags.surveyId, surveyId));
      
      // Insert new state tags if any
      if (states.length > 0) {
        const insertData = states.map(stateCode => ({
          surveyId,
          stateCode
        }));
        await tx.insert(surveyStateTags).values(insertData);
      }
    });
  }

  async getAllSurveysWithStates(): Promise<Array<Survey & { states: StateCode[] }>> {
    try {
      const result = await db
        .select({
          survey: surveys,
          stateCode: surveyStateTags.stateCode,
        })
        .from(surveys)
        .leftJoin(surveyStateTags, eq(surveys.id, surveyStateTags.surveyId))
        .orderBy(desc(surveys.createdAt));

      // Group by survey ID and collect states
      const surveysMap = new Map<number, Survey & { states: StateCode[] }>();
      
      result.forEach(row => {
        const surveyId = row.survey.id;
        if (!surveysMap.has(surveyId)) {
          surveysMap.set(surveyId, {
            ...row.survey,
            states: []
          });
        }
        if (row.stateCode) {
          surveysMap.get(surveyId)!.states.push(row.stateCode as StateCode);
        }
      });

      return Array.from(surveysMap.values());
    } catch (error: any) {
      // Fallback if survey_state_tags table doesn't exist yet
      if (error?.code === '42P01') {
        console.log('survey_state_tags table not found, returning surveys without states');
        const result = await db.select().from(surveys).orderBy(desc(surveys.createdAt));
        return result.map(survey => ({ ...survey, states: [] }));
      }
      throw error;
    }
  }

  // Survey Schedule methods
  async createSurveySchedule(schedule: InsertSurveySchedule): Promise<SurveySchedule> {
    const [newSchedule] = await db.insert(surveySchedules).values(schedule).returning();
    return newSchedule;
  }

  async getSurveySchedule(id: number): Promise<SurveySchedule | undefined> {
    const [schedule] = await db.select().from(surveySchedules).where(eq(surveySchedules.id, id));
    return schedule;
  }

  async getSurveySchedules(surveyId: number): Promise<SurveySchedule[]> {
    return await db.select().from(surveySchedules)
      .where(eq(surveySchedules.surveyId, surveyId))
      .orderBy(desc(surveySchedules.createdAt));
  }

  async getAllSchedules(): Promise<SurveySchedule[]> {
    return await db.select().from(surveySchedules)
      .orderBy(desc(surveySchedules.createdAt));
  }

  async getAllActiveSchedules(): Promise<SurveySchedule[]> {
    return await db.select().from(surveySchedules)
      .where(eq(surveySchedules.isActive, true))
      .orderBy(desc(surveySchedules.createdAt));
  }

  async getSchedulesDueToRun(currentTime: Date): Promise<SurveySchedule[]> {
    return await db.select().from(surveySchedules)
      .where(
        and(
          eq(surveySchedules.isActive, true),
          lte(surveySchedules.nextRun, currentTime),
          lte(surveySchedules.startDate, currentTime), // Should have already started
          sql`(${surveySchedules.endDate} IS NULL OR ${surveySchedules.endDate} >= ${currentTime})` // Not expired
        )
      )
      .orderBy(surveySchedules.nextRun);
  }

  async updateSurveySchedule(id: number, updates: Partial<InsertSurveySchedule>): Promise<SurveySchedule> {
    const [updatedSchedule] = await db.update(surveySchedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(surveySchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async updateScheduleRunTimes(id: number, lastRun: Date, nextRun: Date | null): Promise<void> {
    await db.update(surveySchedules)
      .set({ 
        lastRun, 
        nextRun,
        updatedAt: new Date() 
      })
      .where(eq(surveySchedules.id, id));
  }

  async deleteSurveySchedule(id: number): Promise<void> {
    await db.delete(surveySchedules).where(eq(surveySchedules.id, id));
  }

  async toggleScheduleActive(id: number, isActive: boolean): Promise<void> {
    await db.update(surveySchedules)
      .set({ 
        isActive,
        updatedAt: new Date() 
      })
      .where(eq(surveySchedules.id, id));
  }
}

export const storage = new DatabaseStorage();
