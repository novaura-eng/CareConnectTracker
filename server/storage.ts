import { 
  users,
  caregivers, 
  patients, 
  weeklyCheckIns, 
  surveyResponses,
  type User,
  type UpsertUser,
  type Caregiver, 
  type InsertCaregiver,
  type Patient,
  type InsertPatient,
  type WeeklyCheckIn,
  type InsertWeeklyCheckIn,
  type SurveyResponse,
  type InsertSurveyResponse
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
          id: surveyResponses.id,
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
        checkIn: weeklyCheckIns,
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
}

export const storage = new DatabaseStorage();
