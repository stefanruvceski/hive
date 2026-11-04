CREATE TABLE `money_budgets` (
	`category_id` text NOT NULL,
	`from_month` text NOT NULL,
	`limit_minor` integer NOT NULL,
	PRIMARY KEY(`category_id`, `from_month`),
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `money_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`emoji` text NOT NULL,
	`position` integer NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `money_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
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
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `money_entries_space_date` ON `money_entries` (`space`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `money_entries_recurring_day` ON `money_entries` (`recurring_id`,`date`);--> statement-breakpoint
CREATE TABLE `money_items` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`category_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `money_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `money_items_entry` ON `money_items` (`entry_id`);--> statement-breakpoint
CREATE TABLE `money_prefs` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `money_rates` (
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	`source` text NOT NULL,
	PRIMARY KEY(`currency`, `date`)
);
--> statement-breakpoint
CREATE TABLE `money_recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`space` text NOT NULL,
	`kind` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency` text NOT NULL,
	`category_id` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`frequency` text NOT NULL,
	`day` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	FOREIGN KEY (`category_id`) REFERENCES `money_categories`(`id`) ON UPDATE no action ON DELETE no action
);
