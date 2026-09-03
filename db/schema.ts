import {
  mysqlTable,
  varchar,
  int,
  decimal,
  timestamp,
  boolean,
  text,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ==================== USERS ====================
export const roleEnum = ["admin", "farm_manager", "agronomist", "worker"] as const;

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  kimiUserId: varchar("kimi_user_id", { length: 255 }),
  role: mysqlEnum("role", roleEnum).notNull().default("worker"), // rôle global (admin système)
  avatarUrl: varchar("avatar_url", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ==================== FARMS (المزارع) ====================
export const farms = mysqlTable("farms", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ==================== FARM MEMBERS (أعضاء المزرعة) ====================
export const farmMembers = mysqlTable(
  "farm_members",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 })
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", roleEnum).notNull().default("worker"), // rôle dans CETTE ferme
    isActive: boolean("is_active").notNull().default(true),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("farm_members_farm_user_uidx").on(table.farmId, table.userId),
    index("farm_members_user_id_idx").on(table.userId),
  ]
);

// ==================== FARM INVITATIONS (دعوات الانضمام) ====================
export const farmInvitations = mysqlTable(
  "farm_invitations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 })
      .notNull()
      .references(() => farms.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    role: mysqlEnum("role", roleEnum).notNull().default("worker"),
    code: varchar("code", { length: 32 }).notNull().unique(),
    invitedBy: varchar("invited_by", { length: 36 }).references(() => users.id),
    expiresAt: timestamp("expires_at"),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("farm_invitations_code_idx").on(table.code)]
);

// ==================== FIELDS (الحقول الزراعية) ====================
export const fieldStatusEnum = ["active", "fallow", "harvested", "preparing"] as const;

export const fields = mysqlTable(
  "fields",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    cropType: varchar("crop_type", { length: 255 }).notNull(),
    areaHectares: decimal("area_hectares", { precision: 10, scale: 2 }).notNull(),
    location: varchar("location", { length: 255 }),
    latitude: decimal("latitude", { precision: 10, scale: 6 }),
    longitude: decimal("longitude", { precision: 10, scale: 6 }),
    status: mysqlEnum("status", fieldStatusEnum).notNull().default("preparing"),
    plantedDate: timestamp("planted_date"),
    expectedHarvestDate: timestamp("expected_harvest_date"),
    managerId: varchar("manager_id", { length: 36 }).references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("fields_farm_id_idx").on(table.farmId)]
);

// ==================== WORKERS (العمال) ====================
export const workerStatusEnum = ["active", "on_leave", "inactive"] as const;

export const workers = mysqlTable(
  "workers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    specialty: varchar("specialty", { length: 255 }),
    status: mysqlEnum("status", workerStatusEnum).notNull().default("active"),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    hireDate: timestamp("hire_date"),
    dailyWage: decimal("daily_wage", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("workers_farm_id_idx").on(table.farmId)]
);

// ==================== INVENTORY (المخزون) ====================
export const inventoryCategoryEnum = [
  "seeds",
  "fertilizer",
  "pesticide",
  "equipment",
  "other",
] as const;

export const inventory = mysqlTable(
  "inventory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    category: mysqlEnum("category", inventoryCategoryEnum).notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 2 }).notNull().default("0"),
    unit: varchar("unit", { length: 50 }).notNull(),
    minThreshold: decimal("min_threshold", { precision: 12, scale: 2 }).default("0"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    supplier: varchar("supplier", { length: 255 }),
    expiryDate: timestamp("expiry_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("inventory_farm_id_idx").on(table.farmId)]
);

// ==================== SENSORS (حساسات IoT) ====================
export const sensorTypeEnum = [
  "soil_moisture",
  "temperature",
  "humidity",
  "flow",
  "weather_station",
] as const;

export const sensorStatusEnum = ["online", "offline", "low_battery", "error"] as const;

export const sensors = mysqlTable(
  "sensors",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    deviceId: varchar("device_id", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", sensorTypeEnum).notNull(),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    status: mysqlEnum("status", sensorStatusEnum).notNull().default("offline"),
    batteryLevel: int("battery_level"),
    lastValue: decimal("last_value", { precision: 12, scale: 4 }),
    lastReadingAt: timestamp("last_reading_at"),
    installedAt: timestamp("installed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("sensors_farm_id_idx").on(table.farmId)]
);

export const sensorReadings = mysqlTable(
  "sensor_readings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sensorId: varchar("sensor_id", { length: 36 })
      .notNull()
      .references(() => sensors.id),
    value: decimal("value", { precision: 12, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 20 }),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (table) => [index("sensor_readings_sensor_id_idx").on(table.sensorId)]
);

// ==================== ACTIVITIES ====================
export const activityTypeEnum = [
  "irrigation",
  "fertilization",
  "harvest",
  "planting",
  "maintenance",
  "inventory_update",
  "other",
] as const;

export const activities = mysqlTable(
  "activities",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    type: mysqlEnum("type", activityTypeEnum).notNull(),
    description: text("description").notNull(),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    workerId: varchar("worker_id", { length: 36 }).references(() => workers.id),
    userId: varchar("user_id", { length: 36 }).references(() => users.id),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("activities_farm_id_idx").on(table.farmId)]
);

// ==================== AI INSIGHTS ====================
export const insightSeverityEnum = ["info", "warning", "critical"] as const;

export const aiInsights = mysqlTable(
  "ai_insights",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    severity: mysqlEnum("severity", insightSeverityEnum).notNull().default("info"),
    isResolved: boolean("is_resolved").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("ai_insights_farm_id_idx").on(table.farmId)]
);

// ==================== CALENDAR ====================
export const calendarEventTypeEnum = [
  "irrigation",
  "fertilization",
  "harvest",
  "planting",
  "meeting",
  "maintenance",
  "other",
] as const;

export const calendarEvents = mysqlTable(
  "calendar_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    farmId: varchar("farm_id", { length: 36 }).references(() => farms.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", calendarEventTypeEnum).notNull(),
    fieldId: varchar("field_id", { length: 36 }).references(() => fields.id),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at"),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("calendar_events_farm_id_idx").on(table.farmId)]
);

// ==================== NOTIFICATIONS ====================
export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  link: varchar("link", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== SETTINGS ====================
export const settings = mysqlTable("settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
