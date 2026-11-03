CREATE TABLE `habits_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`time_of_day` text DEFAULT 'anytime' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`done_at` text,
	`priority` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `quit` integer DEFAULT false NOT NULL;