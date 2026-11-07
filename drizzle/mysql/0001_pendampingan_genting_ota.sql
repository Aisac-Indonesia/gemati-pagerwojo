ALTER TABLE `pendampingan` ADD `sasaran_genting` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pendampingan` ADD `bantuan_genting` text;--> statement-breakpoint
ALTER TABLE `pendampingan` ADD `nama_ota` varchar(150);