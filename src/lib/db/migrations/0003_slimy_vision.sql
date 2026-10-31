CREATE TABLE `home_apps` (
	`module_id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`position` integer NOT NULL,
	`pinned_position` integer,
	`hidden` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `home_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
