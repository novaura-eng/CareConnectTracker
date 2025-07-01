import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const caregivers = pgTable("caregivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  medicaidId: text("medicaid_id").notNull(),
  address: text("address"),
  caregiverId: integer("caregiver_id").references(() => caregivers.id).notNull(),
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

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  checkInId: integer("check_in_id").references(() => weeklyCheckIns.id).notNull(),
  hospitalVisits: text("hospital_visits").notNull(), // 'yes' or 'no'
  hospitalDetails: text("hospital_details"),
  accidentsFalls: text("accidents_falls").notNull(), // 'yes' or 'no'
  accidentDetails: text("accident_details"),
  mentalHealth: text("mental_health").notNull(), // 'yes' or 'no'
  mentalHealthDetails: text("mental_health_details"),
  physicalHealth: text("physical_health").notNull(), // 'yes' or 'no'
  physicalHealthDetails: text("physical_health_details"),
  contactChanges: text("contact_changes").notNull(), // 'yes' or 'no'
  contactDetails: text("contact_details"),
  additionalComments: text("additional_comments"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
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

export const weeklyCheckInsRelations = relations(weeklyCheckIns, ({ one }) => ({
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
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  checkIn: one(weeklyCheckIns, {
    fields: [surveyResponses.checkInId],
    references: [weeklyCheckIns.id],
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

// Types
export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = z.infer<typeof insertCaregiverSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type WeeklyCheckIn = typeof weeklyCheckIns.$inferSelect;
export type InsertWeeklyCheckIn = z.infer<typeof insertWeeklyCheckInSchema>;

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
