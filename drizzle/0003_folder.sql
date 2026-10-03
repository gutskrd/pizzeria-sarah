ALTER TABLE "site_settings" ADD COLUMN "folder_key" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_has_inside" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_has_outside" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_cuts" jsonb DEFAULT '{"binnen":[0.3333333333333333,0.6666666666666666],"buiten":[0.3333333333333333,0.6666666666666666]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_panel_width" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_panel_height" integer;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_visible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "folder_updated_at" timestamp with time zone;