import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// US State Codes for survey tagging
export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
] as const;

export const StateCodeSchema = z.enum(US_STATE_CODES);
export type StateCode = z.infer<typeof StateCodeSchema>;

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  state: text("state").notNull(),
  password: text("password"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  medicaidId: text("medicaid_id").notNull(),
  address: text("address"),
  phoneNumber: text("phone_number"),
  emergencyContact: text("emergency_contact"),
  medicalConditions: text("medical_conditions"),
  caregiverId: integer("caregiver_id").references(() => caregivers.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weeklyCheckIns = pgTable("weekly_check_ins", {
  id: serial("id").primaryKey(),
  caregiverId: integer("caregiver_id").references(() => caregivers.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  remindersSent: integer("reminders_sent").default(0).notNull(),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy survey_responses table removed - now using dynamic survey system

// Dynamic Survey System Tables
export const surveys = pgTable("surveys", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, published, archived
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyQuestions = pgTable("survey_questions", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  type: text("type").notNull(), // single_choice, multi_choice, text, textarea, number, boolean, date, rating
  label: text("label").notNull(),
  helpText: text("help_text"),
  required: boolean("required").default(false).notNull(),
  order: integer("order").notNull(),
  validation: jsonb("validation"), // JSON for validation rules (min/max, patterns, etc.)
  visibilityRules: jsonb("visibility_rules"), // JSON for conditional visibility
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const surveyOptions = pgTable("survey_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => surveyQuestions.id).notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Survey Schedules for automated assignment creation
export const surveySchedules = pgTable("survey_schedules", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  scheduleType: text("schedule_type").notNull(), // one_time, daily, weekly, monthly, custom
  frequencyValue: integer("frequency_value"), // 1=daily, 7=weekly, 30=monthly, etc.
  dayOfWeek: integer("day_of_week"), // 0-6 for Sunday-Saturday, nullable
  dayOfMonth: integer("day_of_month"), // 1-31, nullable  
  timeOfDay: text("time_of_day").notNull().default("09:00"), // HH:mm format
  timezone: text("timezone").notNull().default("America/New_York"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // nullable for indefinite schedules
  isActive: boolean("is_active").notNull().default(true),
  lastRun: timestamp("last_run"), // when schedule last created assignments
  nextRun: timestamp("next_run"), // when schedule should next run
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyAssignments = pgTable("survey_assignments", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  caregiverId: integer("caregiver_id").references(() => caregivers.id),
  patientId: integer("patient_id").references(() => patients.id),
  checkInId: integer("check_in_id").references(() => weeklyCheckIns.id),
  // scheduleId: integer("schedule_id").references(() => surveySchedules.id), // Column doesn't exist in production DB yet
  dueAt: timestamp("due_at"),
  // scheduledFor: timestamp("scheduled_for"), // Column doesn't exist in production DB yet
  // autoCreated: boolean("auto_created").notNull().default(false), // Column doesn't exist in production DB yet
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  assignmentId: integer("assignment_id").references(() => surveyAssignments.id),
  checkInId: integer("check_in_id").references(() => weeklyCheckIns.id),
  caregiverId: integer("caregiver_id").references(() => caregivers.id).notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  meta: jsonb("meta"), // JSON for device info, app version, etc.
});

export const surveyResponseItems = pgTable("survey_response_items", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").references(() => surveyResponses.id).notNull(),
  questionId: integer("question_id").references(() => surveyQuestions.id).notNull(),
  answer: jsonb("answer").notNull(), // JSON to support any answer type
  answerText: text("answer_text"), // For indexing text answers
  answerNumber: integer("answer_number"), // For indexing numeric answers
  answerBoolean: boolean("answer_boolean"), // For indexing boolean answers
  answerDate: timestamp("answer_date"), // For indexing date answers
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Survey State Tags for organizing surveys by state
export const surveyStateTags = pgTable("survey_state_tags", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("unique_survey_state").on(table.surveyId, table.stateCode),
]);

// Relations
export const caregiversRelations = relations(caregivers, ({ many }) => ({
  patients: many(patients),
  checkIns: many(weeklyCheckIns),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  caregiver: one(caregivers, {
    fields: [patients.caregiverId],
    references: [caregivers.id],
  }),
  checkIns: many(weeklyCheckIns),
}));

export const weeklyCheckInsRelations = relations(weeklyCheckIns, ({ one, many }) => ({
  caregiver: one(caregivers, {
    fields: [weeklyCheckIns.caregiverId],
    references: [caregivers.id],
  }),
  patient: one(patients, {
    fields: [weeklyCheckIns.patientId],
    references: [patients.id],
  }),
  response: one(surveyResponses, {
    fields: [weeklyCheckIns.id],
    references: [surveyResponses.checkInId],
  }),
  // survey: one(surveys, {
  //   fields: [weeklyCheckIns.surveyId],
  //   references: [surveys.id],
  // }), // Commented out - surveyId column doesn't exist in production DB yet
  assignments: many(surveyAssignments),
  surveyResponses: many(surveyResponses),
}));

// Legacy surveyResponses relation removed - using dynamic survey relations below

// Survey System Relations
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [surveys.createdBy],
    references: [users.id],
  }),
  questions: many(surveyQuestions),
  assignments: many(surveyAssignments),
  responses: many(surveyResponses),
  weeklyCheckIns: many(weeklyCheckIns),
  stateTags: many(surveyStateTags),
  schedules: many(surveySchedules),
}));

export const surveySchedulesRelations = relations(surveySchedules, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveySchedules.surveyId],
    references: [surveys.id],
  }),
  assignments: many(surveyAssignments),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  options: many(surveyOptions),
  responseItems: many(surveyResponseItems),
}));

export const surveyOptionsRelations = relations(surveyOptions, ({ one }) => ({
  question: one(surveyQuestions, {
    fields: [surveyOptions.questionId],
    references: [surveyQuestions.id],
  }),
}));

export const surveyAssignmentsRelations = relations(surveyAssignments, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyAssignments.surveyId],
    references: [surveys.id],
  }),
  caregiver: one(caregivers, {
    fields: [surveyAssignments.caregiverId],
    references: [caregivers.id],
  }),
  patient: one(patients, {
    fields: [surveyAssignments.patientId],
    references: [patients.id],
  }),
  checkIn: one(weeklyCheckIns, {
    fields: [surveyAssignments.checkInId],
    references: [weeklyCheckIns.id],
  }),
  // schedule: one(surveySchedules, {
  //   fields: [surveyAssignments.scheduleId],
  //   references: [surveySchedules.id],
  // }), // Commented out - scheduleId column doesn't exist in production DB yet
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  assignment: one(surveyAssignments, {
    fields: [surveyResponses.assignmentId],
    references: [surveyAssignments.id],
  }),
  checkIn: one(weeklyCheckIns, {
    fields: [surveyResponses.checkInId],
    references: [weeklyCheckIns.id],
  }),
  caregiver: one(caregivers, {
    fields: [surveyResponses.caregiverId],
    references: [caregivers.id],
  }),
  patient: one(patients, {
    fields: [surveyResponses.patientId],
    references: [patients.id],
  }),
  items: many(surveyResponseItems),
}));

export const surveyResponseItemsRelations = relations(surveyResponseItems, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyResponseItems.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyResponseItems.questionId],
    references: [surveyQuestions.id],
  }),
}));

export const surveyStateTagsRelations = relations(surveyStateTags, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyStateTags.surveyId],
    references: [surveys.id],
  }),
}));

// Insert schemas
export const insertCaregiverSchema = createInsertSchema(caregivers).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyCheckInSchema = createInsertSchema(weeklyCheckIns).omit({
  id: true,
  createdAt: true,
});

// Legacy surveyResponse insert schema removed - using dynamic survey schema below

// Dynamic Survey Insert Schemas
export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertSurveyOptionSchema = createInsertSchema(surveyOptions).omit({
  id: true,
  createdAt: true,
});

export const insertSurveyAssignmentSchema = createInsertSchema(surveyAssignments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertSurveyResponseItemSchema = createInsertSchema(surveyResponseItems).omit({
  id: true,
  createdAt: true,
});

export const insertSurveyStateTagSchema = createInsertSchema(surveyStateTags).omit({
  id: true,
  createdAt: true,
});

export const insertSurveyScheduleSchema = createInsertSchema(surveySchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRun: true,
  nextRun: true,
  startDate: true,
  endDate: true,
}).extend({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

// Enhanced Patient type with survey status information
export interface PatientWithSurveyStatus extends Patient {
  surveyStatus: {
    pendingAssignments: number;
    completedSurveys: number;
    lastSurveyDate: string | null;
    availableSurveys: number;
  };
}

export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type InsertWeeklyCheckIn = z.infer<typeof insertWeeklyCheckInSchema>;

// Legacy survey response types removed - using dynamic survey types below

// Dynamic Survey Types
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;

export type SurveyOption = typeof surveyOptions.$inferSelect;
export type InsertSurveyOption = z.infer<typeof insertSurveyOptionSchema>;

export type SurveyAssignment = typeof surveyAssignments.$inferSelect;
export type InsertSurveyAssignment = z.infer<typeof insertSurveyAssignmentSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

export type SurveyResponseItem = typeof surveyResponseItems.$inferSelect;
export type InsertSurveyResponseItem = z.infer<typeof insertSurveyResponseItemSchema>;

export type SurveyStateTag = typeof surveyStateTags.$inferSelect;
export type InsertSurveyStateTag = z.infer<typeof insertSurveyStateTagSchema>;

export type SurveySchedule = typeof surveySchedules.$inferSelect;
export type InsertSurveySchedule = z.infer<typeof insertSurveyScheduleSchema>;

// Schedule Type Constants
export const SCHEDULE_TYPES = {
  ONE_TIME: 'one_time',
  DAILY: 'daily', 
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom'
} as const;

export type ScheduleType = typeof SCHEDULE_TYPES[keyof typeof SCHEDULE_TYPES];

// Helper type for creating schedules with validation
export const scheduleTypeSchema = z.enum(['one_time', 'daily', 'weekly', 'monthly', 'custom']);

// Day of week constants (0 = Sunday, 6 = Saturday)
export const DAY_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6
} as const;
