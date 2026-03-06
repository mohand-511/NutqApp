import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  points: integer("points").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  level: text("level").notNull().default("مبتدئ"),
  goal: text("goal").notNull().default("التحدث بثقة"),
  completedStages: jsonb("completed_stages").notNull().default([]),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("dark"),
  language: text("language").notNull().default("ar"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  dailyReminder: boolean("daily_reminder").notNull().default(true),
  privacyMode: boolean("privacy_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  mode: text("mode").notNull().default("casual"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  points: integer("points").notNull().default(0),
  icon: text("icon").notNull().default("star"),
  color: text("color").notNull().default("#2563EB"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UserActivity = typeof userActivity.$inferSelect;
