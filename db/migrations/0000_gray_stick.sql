CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`type` enum('irrigation','fertilization','harvest','planting','maintenance','inventory_update','other') NOT NULL,
	`description` text NOT NULL,
	`field_id` varchar(36),
	`worker_id` varchar(36),
	`user_id` varchar(36),
	`metadata` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` varchar(36) NOT NULL,
	`field_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'info',
	`is_resolved` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('irrigation','fertilization','harvest','planting','meeting','maintenance','other') NOT NULL,
	`field_id` varchar(36),
	`start_at` timestamp NOT NULL,
	`end_at` timestamp,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fields` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`crop_type` varchar(255) NOT NULL,
	`area_hectares` decimal(10,2) NOT NULL,
	`location` varchar(255),
	`latitude` decimal(10,6),
	`longitude` decimal(10,6),
	`status` enum('active','fallow','harvested','preparing') NOT NULL DEFAULT 'preparing',
	`planted_date` timestamp,
	`expected_harvest_date` timestamp,
	`manager_id` varchar(36),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('seeds','fertilizer','pesticide','equipment','other') NOT NULL,
	`quantity` decimal(12,2) NOT NULL DEFAULT '0',
	`unit` varchar(50) NOT NULL,
	`min_threshold` decimal(12,2) DEFAULT '0',
	`unit_cost` decimal(12,2),
	`field_id` varchar(36),
	`supplier` varchar(255),
	`expiry_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`link` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` varchar(36) NOT NULL,
	`sensor_id` varchar(36) NOT NULL,
	`value` decimal(12,4) NOT NULL,
	`unit` varchar(20),
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sensor_readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sensors` (
	`id` varchar(36) NOT NULL,
	`device_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('soil_moisture','temperature','humidity','flow','weather_station') NOT NULL,
	`field_id` varchar(36),
	`status` enum('online','offline','low_battery','error') NOT NULL DEFAULT 'offline',
	`battery_level` int,
	`last_value` decimal(12,4),
	`last_reading_at` timestamp,
	`installed_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sensors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sensors_device_id_unique` UNIQUE(`device_id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255),
	`kimi_user_id` varchar(255),
	`role` enum('admin','farm_manager','agronomist','worker') NOT NULL DEFAULT 'worker',
	`avatar_url` varchar(500),
	`phone` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`phone` varchar(50),
	`specialty` varchar(255),
	`status` enum('active','on_leave','inactive') NOT NULL DEFAULT 'active',
	`field_id` varchar(36),
	`hire_date` timestamp,
	`daily_wage` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_worker_id_workers_id_fk` FOREIGN KEY (`worker_id`) REFERENCES `workers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fields` ADD CONSTRAINT `fields_manager_id_users_id_fk` FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD CONSTRAINT `sensor_readings_sensor_id_sensors_id_fk` FOREIGN KEY (`sensor_id`) REFERENCES `sensors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sensors` ADD CONSTRAINT `sensors_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `settings` ADD CONSTRAINT `settings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workers` ADD CONSTRAINT `workers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workers` ADD CONSTRAINT `workers_field_id_fields_id_fk` FOREIGN KEY (`field_id`) REFERENCES `fields`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sensor_readings_sensor_id_idx` ON `sensor_readings` (`sensor_id`);