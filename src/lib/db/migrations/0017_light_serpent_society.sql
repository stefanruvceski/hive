CREATE TABLE `wallet_receipt_items` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` integer NOT NULL,
	`total` integer NOT NULL,
	`unit` text,
	`vat` text,
	FOREIGN KEY (`receipt_id`) REFERENCES `wallet_receipts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `wallet_receipt_items_receipt_idx` ON `wallet_receipt_items` (`receipt_id`);--> statement-breakpoint
CREATE TABLE `wallet_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`source_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`company` text,
	`shop` text,
	`address` text,
	`city` text,
	`tin` text,
	`total` integer,
	`time` text,
	`invoice_number` text,
	`refund` integer DEFAULT false NOT NULL,
	`payment` text,
	`journal` text,
	`note` text DEFAULT '' NOT NULL,
	`error` text,
	`added_at` integer NOT NULL,
	`buyer_tin` text,
	`owner_manual` integer DEFAULT false NOT NULL,
	`starred` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wallet_receipts_source_key_unique` ON `wallet_receipts` (`source_key`);