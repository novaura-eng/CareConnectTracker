import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  surveyId: integer("survey_id").references(() => surveys.id), // Optional link to dynamic survey
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  checkInId: integer("check_in_id").references(() => weeklyCheckIns.id).notNull(),
  hospitalVisits: boolean("hospital_visits").default(false).notNull(),
  hospitalDetails: text("hospital_details"),
  accidentsFalls: boolean("accidents_falls").default(false).notNull(),
  accidentDetails: text("accident_details"),
  mentalHealth: boolean("mental_health").default(false).notNull(),
  mentalHealthDetails: text("mental_health_details"),
  physicalHealth: boolean("physical_health").default(false).notNull(),
  physicalHealthDetails: text("physical_health_details"),
  contactChanges: boolean("contact_changes").default(false).notNull(),
  contactDetails: text("contact_details"),
  additionalComments: text("additional_comments"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

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

export const surveyAssignments = pgTable("survey_assignments", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => surveys.id).notNull(),
  caregiverId: integer("caregiver_id").references(() => caregivers.id),
  patientId: integer("patient_id").references(() => patients.id),
  checkInId: integer("check_in_id").references(() => weeklyCheckIns.id),
  dueAt: timestamp("due_at"),
  status: text("status").notNull().default("pending"), // pending, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const surveyResponsesV2 = pgTable("survey_responses_v2", {
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
  responseId: integer("response_id").references(() => surveyResponsesV2.id).notNull(),
  questionId: integer("question_id").references(() => surveyQuestions.id).notNull(),
  answer: jsonb("answer").notNull(), // JSON to support any answer type
  answerText: text("answer_text"), // For indexing text answers
  answerNumber: integer("answer_number"), // For indexing numeric answers
  answerBoolean: boolean("answer_boolean"), // For indexing boolean answers
  answerDate: timestamp("answer_date"), // For indexing date answers
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  survey: one(surveys, {
    fields: [weeklyCheckIns.surveyId],
    references: [surveys.id],
  }),
  assignments: many(surveyAssignments),
  surveyResponsesV2: many(surveyResponsesV2),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  checkIn: one(weeklyCheckIns, {
    fields: [surveyResponses.checkInId],
    references: [weeklyCheckIns.id],
  }),
}));

// Survey System Relations
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [surveys.createdBy],
    references: [users.id],
  }),
  questions: many(surveyQuestions),
  assignments: many(surveyAssignments),
  responses: many(surveyResponsesV2),
  weeklyCheckIns: many(weeklyCheckIns),
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
  responses: many(surveyResponsesV2),
}));

export const surveyResponsesV2Relations = relations(surveyResponsesV2, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyResponsesV2.surveyId],
    references: [surveys.id],
  }),
  assignment: one(surveyAssignments, {
    fields: [surveyResponsesV2.assignmentId],
    references: [surveyAssignments.id],
  }),
  checkIn: one(weeklyCheckIns, {
    fields: [surveyResponsesV2.checkInId],
    references: [weeklyCheckIns.id],
  }),
  caregiver: one(caregivers, {
    fields: [surveyResponsesV2.caregiverId],
    references: [caregivers.id],
  }),
  patient: one(patients, {
    fields: [surveyResponsesV2.patientId],
    references: [patients.id],
  }),
  items: many(surveyResponseItems),
}));

export const surveyResponseItemsRelations = relations(surveyResponseItems, ({ one }) => ({
  response: one(surveyResponsesV2, {
    fields: [surveyResponseItems.responseId],
    references: [surveyResponsesV2.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyResponseItems.questionId],
    references: [surveyQuestions.id],
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

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  id: true,
  submittedAt: true,
});

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

export const insertSurveyResponseV2Schema = createInsertSchema(surveyResponsesV2).omit({
  id: true,
  submittedAt: true,
});

export const insertSurveyResponseItemSchema = createInsertSchema(surveyResponseItems).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type InsertWeeklyCheckIn = z.infer<typeof insertWeeklyCheckInSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;

// Dynamic Survey Types
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;

export type SurveyOption = typeof surveyOptions.$inferSelect;
export type InsertSurveyOption = z.infer<typeof insertSurveyOptionSchema>;

export type SurveyAssignment = typeof surveyAssignments.$inferSelect;
export type InsertSurveyAssignment = z.infer<typeof insertSurveyAssignmentSchema>;

export type SurveyResponseV2 = typeof surveyResponsesV2.$inferSelect;
export type InsertSurveyResponseV2 = z.infer<typeof insertSurveyResponseV2Schema>;

export type SurveyResponseItem = typeof surveyResponseItems.$inferSelect;
export type InsertSurveyResponseItem = z.infer<typeof insertSurveyResponseItemSchema>;
