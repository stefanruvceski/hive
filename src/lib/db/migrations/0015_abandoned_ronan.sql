CREATE TABLE `core_event_cursor` (
	`consumer` text PRIMARY KEY NOT NULL,
	`last_event_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `core_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`version` integer NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
