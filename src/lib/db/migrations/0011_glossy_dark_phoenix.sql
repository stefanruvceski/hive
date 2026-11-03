ALTER TABLE `habits_completions` ADD `amount` real;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `schedule_type` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `schedule_days` text;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `schedule_times` integer;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `unit` text;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `target` real;--> statement-breakpoint
ALTER TABLE `habits_habits` ADD `aggregation` text DEFAULT 'sum' NOT NULL;