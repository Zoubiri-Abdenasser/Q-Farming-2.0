import { relations } from "drizzle-orm";
import {
  users,
  farms,
  farmMembers,
  farmInvitations,
  fields,
  workers,
  inventory,
  sensors,
  sensorReadings,
  activities,
  aiInsights,
  calendarEvents,
  notifications,
  settings,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  ownedFarms: many(farms),
  memberships: many(farmMembers),
  managedFields: many(fields),
  workerProfile: many(workers),
  activities: many(activities),
  notifications: many(notifications),
  settings: many(settings),
  calendarEvents: many(calendarEvents),
  invitationsSent: many(farmInvitations),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  owner: one(users, {
    fields: [farms.ownerId],
    references: [users.id],
  }),
  members: many(farmMembers),
  invitations: many(farmInvitations),
  fields: many(fields),
  workers: many(workers),
  inventoryItems: many(inventory),
  sensors: many(sensors),
  activities: many(activities),
  aiInsights: many(aiInsights),
  calendarEvents: many(calendarEvents),
}));

export const farmMembersRelations = relations(farmMembers, ({ one }) => ({
  farm: one(farms, {
    fields: [farmMembers.farmId],
    references: [farms.id],
  }),
  user: one(users, {
    fields: [farmMembers.userId],
    references: [users.id],
  }),
}));

export const farmInvitationsRelations = relations(farmInvitations, ({ one }) => ({
  farm: one(farms, {
    fields: [farmInvitations.farmId],
    references: [farms.id],
  }),
  inviter: one(users, {
    fields: [farmInvitations.invitedBy],
    references: [users.id],
  }),
}));

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  farm: one(farms, {
    fields: [fields.farmId],
    references: [farms.id],
  }),
  manager: one(users, {
    fields: [fields.managerId],
    references: [users.id],
  }),
  workers: many(workers),
  inventoryItems: many(inventory),
  sensors: many(sensors),
  activities: many(activities),
  aiInsights: many(aiInsights),
  calendarEvents: many(calendarEvents),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  farm: one(farms, {
    fields: [workers.farmId],
    references: [farms.id],
  }),
  user: one(users, {
    fields: [workers.userId],
    references: [users.id],
  }),
  field: one(fields, {
    fields: [workers.fieldId],
    references: [fields.id],
  }),
  activities: many(activities),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  farm: one(farms, {
    fields: [inventory.farmId],
    references: [farms.id],
  }),
  field: one(fields, {
    fields: [inventory.fieldId],
    references: [fields.id],
  }),
}));

export const sensorsRelations = relations(sensors, ({ one, many }) => ({
  farm: one(farms, {
    fields: [sensors.farmId],
    references: [farms.id],
  }),
  field: one(fields, {
    fields: [sensors.fieldId],
    references: [fields.id],
  }),
  readings: many(sensorReadings),
}));

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  sensor: one(sensors, {
    fields: [sensorReadings.sensorId],
    references: [sensors.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  farm: one(farms, {
    fields: [activities.farmId],
    references: [farms.id],
  }),
  field: one(fields, {
    fields: [activities.fieldId],
    references: [fields.id],
  }),
  worker: one(workers, {
    fields: [activities.workerId],
    references: [workers.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  farm: one(farms, {
    fields: [aiInsights.farmId],
    references: [farms.id],
  }),
  field: one(fields, {
    fields: [aiInsights.fieldId],
    references: [fields.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  farm: one(farms, {
    fields: [calendarEvents.farmId],
    references: [farms.id],
  }),
  field: one(fields, {
    fields: [calendarEvents.fieldId],
    references: [fields.id],
  }),
  creator: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(users, {
    fields: [settings.userId],
    references: [users.id],
  }),
}));
