ALTER TABLE "pendampingan" ADD COLUMN IF NOT EXISTS "sasaran_genting" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pendampingan" ADD COLUMN IF NOT EXISTS "bantuan_genting" text;--> statement-breakpoint
ALTER TABLE "pendampingan" ADD COLUMN IF NOT EXISTS "nama_ota" varchar(150);