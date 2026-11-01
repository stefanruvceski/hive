CREATE TABLE `habits_completions` (
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`habit_id`, `date`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits_habits`(`id`) ON UPDATE no action ON DELETE cascade
);
