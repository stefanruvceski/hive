ALTER TABLE `money_businesses` RENAME TO `core_businesses`;--> statement-breakpoint
DROP INDEX `money_businesses_pib_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `core_businesses_pib_unique` ON `core_businesses` (`pib`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_money_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`business_id` text,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`rate` real DEFAULT 1 NOT NULL,
	`amount_rsd_minor` integer NOT NULL,
	`category_id` text,
	`date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`pair_id` text,
	`recurring_id` text,
	`created_at` text NOT NULL,
	`source` text,
	`source_ref` text,
	FOREIGN KEY (`business_id`) REFERENCES `core_businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_money_entries`("id", "space", "business_id", "kind", "amount_minor", "currency", "rate", "amount_rsd_minor", "category_id", "date", "note", "pair_id", "recurring_id", "created_at", "source", "source_ref") SELECT "id", "space", "business_id", "kind", "amount_minor", "currency", "rate", "amount_rsd_minor", "category_id", "date", "note", "pair_id", "recurring_id", "created_at", "source", "source_ref" FROM `money_entries`;--> statement-breakpoint
DROP TABLE `money_entries`;--> statement-breakpoint
ALTER TABLE `__new_money_entries` RENAME TO `money_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `money_entries_space_date` ON `money_entries` (`space`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `money_entries_recurring_day` ON `money_entries` (`recurring_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `money_entries_source_ref` ON `money_entries` (`source_ref`);--> statement-breakpoint
CREATE TABLE `__new_money_recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`business_id` text,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`category_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`frequency` text NOT NULL,
	`day` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	FOREIGN KEY (`business_id`) REFERENCES `core_businesses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_money_recurring`("id", "space", "business_id", "kind", "amount_minor", "currency", "category_id", "note", "frequency", "day", "start_date", "end_date") SELECT "id", "space", "business_id", "kind", "amount_minor", "currency", "category_id", "note", "frequency", "day", "start_date", "end_date" FROM `money_recurring`;--> statement-breakpoint
DROP TABLE `money_recurring`;--> statement-breakpoint
ALTER TABLE `__new_money_recurring` RENAME TO `money_recurring`;