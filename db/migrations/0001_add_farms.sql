-- Q-Farming 2.0 - Migration Étape 1 : Multi-ferme
-- Exécuter manuellement ou via drizzle-kit

CREATE TABLE IF NOT EXISTS `farms` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `location` varchar(255),
  `description` text,
  `owner_id` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `farms_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `farm_members` (
  `id` varchar(36) NOT NULL,
  `farm_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role` enum('admin','farm_manager','agronomist','worker') NOT NULL DEFAULT 'worker',
  `is_active` boolean NOT NULL DEFAULT true,
  `joined_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `farm_members_id` PRIMARY KEY(`id`)
);

CREATE TABLE IF NOT EXISTS `farm_invitations` (
  `id` varchar(36) NOT NULL,
  `farm_id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('admin','farm_manager','agronomist','worker') NOT NULL DEFAULT 'worker',
  `code` varchar(32) NOT NULL,
  `invited_by` varchar(36),
  `expires_at` timestamp,
  `accepted_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `farm_invitations_id` PRIMARY KEY(`id`),
  CONSTRAINT `farm_invitations_code_unique` UNIQUE(`code`)
);

-- Indexes
CREATE INDEX `farm_members_user_id_idx` ON `farm_members` (`user_id`);
CREATE UNIQUE INDEX `farm_members_farm_user_uidx` ON `farm_members` (`farm_id`, `user_id`);
CREATE INDEX `farm_invitations_code_idx` ON `farm_invitations` (`code`);

-- Foreign keys
ALTER TABLE `farms` ADD CONSTRAINT `farms_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `farm_members` ADD CONSTRAINT `farm_members_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `farm_members` ADD CONSTRAINT `farm_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `farm_invitations` ADD CONSTRAINT `farm_invitations_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `farm_invitations` ADD CONSTRAINT `farm_invitations_invited_by_users_id_fk` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

-- Ajouter farm_id aux tables existantes (nullable pour migration douce)
ALTER TABLE `fields` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `workers` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `inventory` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `sensors` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `activities` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `ai_insights` ADD COLUMN `farm_id` varchar(36);
ALTER TABLE `calendar_events` ADD COLUMN `farm_id` varchar(36);

CREATE INDEX `fields_farm_id_idx` ON `fields` (`farm_id`);
CREATE INDEX `workers_farm_id_idx` ON `workers` (`farm_id`);
CREATE INDEX `inventory_farm_id_idx` ON `inventory` (`farm_id`);
CREATE INDEX `sensors_farm_id_idx` ON `sensors` (`farm_id`);
CREATE INDEX `activities_farm_id_idx` ON `activities` (`farm_id`);
CREATE INDEX `ai_insights_farm_id_idx` ON `ai_insights` (`farm_id`);
CREATE INDEX `calendar_events_farm_id_idx` ON `calendar_events` (`farm_id`);

ALTER TABLE `fields` ADD CONSTRAINT `fields_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `workers` ADD CONSTRAINT `workers_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `sensors` ADD CONSTRAINT `sensors_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `activities` ADD CONSTRAINT `activities_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_farm_id_farms_id_fk` FOREIGN KEY (`farm_id`) REFERENCES `farms`(`id`) ON DELETE cascade ON UPDATE no action;
