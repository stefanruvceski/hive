CREATE TABLE `home_app_usage` (
	`module_id` text NOT NULL,
	`date` text NOT NULL,
	`opens` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`module_id`, `date`)
);
