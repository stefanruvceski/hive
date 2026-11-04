ALTER TABLE `money_entries` ADD `source` text;--> statement-breakpoint
ALTER TABLE `money_entries` ADD `source_ref` text;--> statement-breakpoint
CREATE UNIQUE INDEX `money_entries_source_ref` ON `money_entries` (`source_ref`);