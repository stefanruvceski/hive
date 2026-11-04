CREATE TABLE `wallet_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`number` text NOT NULL,
	`format` text NOT NULL,
	`color` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`added_at` integer NOT NULL,
	`last_used` integer,
	`uses` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT false NOT NULL
);
