ALTER TABLE "messages" DROP CONSTRAINT "messages_status_valid";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "spam_score" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "spam_reasons" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "fingerprint" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "last_message_alert_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "messages_fingerprint_idx" ON "messages" USING btree ("fingerprint","created_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_status_valid" CHECK (status in ('new','read','replied','archived','spam'));