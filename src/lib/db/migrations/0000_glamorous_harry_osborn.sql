CREATE TABLE `home_modules` (
	`module_id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`hidden` integer DEFAULT false NOT NULL
);
