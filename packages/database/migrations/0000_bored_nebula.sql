CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`slug` text(255) NOT NULL,
	`description` text,
	`image_url` text(500),
	`updated_at` integer,
	`parsed_at` integer
);
--> statement-breakpoint
CREATE INDEX `brands_name_idx` ON `brands` (`name`);--> statement-breakpoint
CREATE INDEX `brands_slug_idx` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `tobaccos` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`slug` text(255) NOT NULL,
	`description` text,
	`image_url` text(500),
	`updated_at` integer,
	`parsed_at` integer,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tobaccos_brand_id_idx` ON `tobaccos` (`brand_id`);--> statement-breakpoint
CREATE INDEX `tobaccos_name_idx` ON `tobaccos` (`name`);--> statement-breakpoint
CREATE INDEX `tobaccos_slug_idx` ON `tobaccos` (`slug`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`key_hash` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
--> statement-breakpoint
CREATE INDEX `api_keys_key_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_is_active_idx` ON `api_keys` (`is_active`);