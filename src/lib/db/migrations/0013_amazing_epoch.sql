CREATE TABLE `habits_reminders` (
	`time_of_day` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`hour` integer NOT NULL,
	`minute` integer NOT NULL
);
