CREATE TABLE `wallet_not_same` (
	`pair` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallet_product_aliases` (
	`key` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `wallet_shop_aliases` (
	`key` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text
);
