CREATE TABLE IF NOT EXISTS `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`name` text NOT NULL,
	`grams` integer NOT NULL,
	`price` integer NOT NULL,
	`cleaning` integer NOT NULL,
	`preparation` text NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`price` integer NOT NULL,
	`stock` integer NOT NULL,
	`cleaning` integer DEFAULT 10000 NOT NULL,
	`district` text NOT NULL,
	`landed` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`status` text DEFAULT 'awaiting' NOT NULL,
	`total` integer NOT NULL,
	`delivery_fee` integer NOT NULL,
	`method` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`name` text NOT NULL,
	`created` text NOT NULL,
	`request_key` text NOT NULL,
	FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`district` text DEFAULT 'Negombo' NOT NULL,
	`harbor` text DEFAULT '' NOT NULL,
	`vessel` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'consumer' NOT NULL,
	`verification` text DEFAULT 'pending' NOT NULL,
	`contacts` text DEFAULT '[]' NOT NULL,
	`delivery` integer DEFAULT 0 NOT NULL,
	`delivery_fee` integer DEFAULT 35000 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `records` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`seller_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `reviews_order_id_unique` ON `reviews` (`order_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings(seller_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_seller_idx ON orders(seller_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_type_idx ON records(type);
