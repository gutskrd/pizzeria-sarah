CREATE TABLE "activity_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"summary" text NOT NULL,
	"area" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_lowercase" CHECK ("admin_users"."email" = lower("admin_users"."email"))
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon" text DEFAULT 'heart' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "highlights_icon_valid" CHECK (icon in ('seat','pizza','clock','grill','heart','bag'))
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"variant_widths" integer[] NOT NULL,
	"placeholder" text DEFAULT '' NOT NULL,
	"bytes" integer NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "images_dimensions_positive" CHECK ("images"."width" > 0 and "images"."height" > 0),
	CONSTRAINT "images_title_length" CHECK (char_length("images"."title") <= 120),
	CONSTRAINT "images_alt_length" CHECK (char_length("images"."alt_text") <= 300),
	CONSTRAINT "images_caption_length" CHECK (char_length("images"."caption") <= 300)
);
--> statement-breakpoint
CREATE TABLE "login_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"remember" boolean DEFAULT false NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"send_count" smallint DEFAULT 1 NOT NULL,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_challenges_attempts_range" CHECK ("login_challenges"."attempts" >= 0 and "login_challenges"."attempts" <= 20)
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_categories_name_length" CHECK (char_length("menu_categories"."name") between 1 and 80),
	CONSTRAINT "menu_categories_slug_format" CHECK ("menu_categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"label" text NOT NULL,
	"price_cents" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_item_variants_label_length" CHECK (char_length("menu_item_variants"."label") between 1 and 40),
	CONSTRAINT "menu_item_variants_price_range" CHECK ("menu_item_variants"."price_cents" >= 0 and "menu_item_variants"."price_cents" <= 100000)
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer,
	"allergens" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_name_length" CHECK (char_length("menu_items"."name") between 1 and 120),
	CONSTRAINT "menu_items_price_range" CHECK ("menu_items"."price_cents" is null or ("menu_items"."price_cents" >= 0 and "menu_items"."price_cents" <= 100000))
);
--> statement-breakpoint
CREATE TABLE "message_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_replies_body_length" CHECK (char_length("message_replies"."body") between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	CONSTRAINT "messages_status_valid" CHECK (status in ('new','read','replied','archived')),
	CONSTRAINT "messages_body_length" CHECK (char_length("messages"."body") between 1 and 5000),
	CONSTRAINT "messages_name_length" CHECK (char_length("messages"."name") between 1 and 100),
	CONSTRAINT "messages_subject_length" CHECK (char_length("messages"."subject") between 1 and 150)
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_text" text DEFAULT '' NOT NULL,
	"image_id" uuid,
	"starts_on" date,
	"ends_on" date,
	"is_visible" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_title_length" CHECK (char_length("offers"."title") between 1 and 120),
	CONSTRAINT "offers_date_order" CHECK ("offers"."starts_on" is null or "offers"."ends_on" is null or "offers"."ends_on" >= "offers"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "opening_days" (
	"weekday" smallint PRIMARY KEY NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "opening_days_weekday_range" CHECK ("opening_days"."weekday" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "opening_exception_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exception_id" uuid NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "opening_exception_periods_order" CHECK ("opening_exception_periods"."closes_at" > "opening_exception_periods"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "opening_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"is_closed" boolean NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opening_exceptions_range_order" CHECK ("opening_exceptions"."ends_on" >= "opening_exceptions"."starts_on"),
	CONSTRAINT "opening_exceptions_label_length" CHECK (char_length("opening_exceptions"."label") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "opening_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "opening_periods_order" CHECK ("opening_periods"."closes_at" > "opening_periods"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "page_seo" (
	"page_key" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_seo_key_valid" CHECK (page_key in ('home','menukaart','over-ons','galerij','contact','privacy','voorwaarden')),
	CONSTRAINT "page_seo_title_length" CHECK (char_length("page_seo"."title") between 1 and 120),
	CONSTRAINT "page_seo_description_length" CHECK (char_length("page_seo"."description") between 1 and 320)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"device_summary" text,
	"ip" text,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "security_events_type_valid" CHECK (type in ('login_success','login_failed','login_new_device','verification_sent','verification_failed','verification_success','logout','session_terminated','sessions_terminated_all','session_suspicious','password_changed','password_reset_requested','password_reset_completed','email_changed'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"prev_token_hash" text,
	"token_rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"remember" boolean DEFAULT false NOT NULL,
	"trusted_device_id" uuid,
	"device_type" text NOT NULL,
	"device_name" text NOT NULL,
	"browser" text NOT NULL,
	"os" text NOT NULL,
	"client_fingerprint" text NOT NULL,
	"ip" text,
	"country" text,
	"region" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "sessions_revoked_reason_valid" CHECK ("sessions"."revoked_reason" is null or "sessions"."revoked_reason" in ('logout','terminated','terminated_all','password_changed','password_reset','suspicious','expired'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" text NOT NULL,
	"tagline" text NOT NULL,
	"phone_display" text NOT NULL,
	"phone_e164" text NOT NULL,
	"email" text NOT NULL,
	"street" text DEFAULT '' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"founded_year" smallint,
	"facebook_url" text DEFAULT '' NOT NULL,
	"instagram_url" text DEFAULT '' NOT NULL,
	"hero_title" text NOT NULL,
	"hero_text" text NOT NULL,
	"hero_image_id" uuid,
	"intro_title" text NOT NULL,
	"intro_text" text NOT NULL,
	"about_title" text NOT NULL,
	"about_text" text NOT NULL,
	"about_story" text NOT NULL,
	"about_image_id" uuid,
	"waiting_area_text" text NOT NULL,
	"reservation_text" text NOT NULL,
	"allergen_text" text NOT NULL,
	"footer_text" text NOT NULL,
	"show_gallery_on_home" boolean DEFAULT true NOT NULL,
	"show_featured_menu_on_home" boolean DEFAULT true NOT NULL,
	"menu_pdf_key" text,
	"menu_pdf_bytes" integer,
	"menu_pdf_updated_at" timestamp with time zone,
	"new_device_alerts" boolean DEFAULT true NOT NULL,
	"message_alerts" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_challenges" ADD CONSTRAINT "login_challenges_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_replies" ADD CONSTRAINT "message_replies_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_replies" ADD CONSTRAINT "message_replies_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_exception_periods" ADD CONSTRAINT "opening_exception_periods_exception_id_opening_exceptions_id_fk" FOREIGN KEY ("exception_id") REFERENCES "public"."opening_exceptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_periods" ADD CONSTRAINT "opening_periods_weekday_opening_days_weekday_fk" FOREIGN KEY ("weekday") REFERENCES "public"."opening_days"("weekday") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_trusted_device_id_trusted_devices_id_fk" FOREIGN KEY ("trusted_device_id") REFERENCES "public"."trusted_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_hero_image_id_images_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_about_image_id_images_id_fk" FOREIGN KEY ("about_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_created_idx" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "images_storage_key_key" ON "images" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "images_gallery_idx" ON "images" USING btree ("deleted_at","is_visible","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "login_challenges_token_hash_key" ON "login_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_slug_key" ON "menu_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "menu_item_variants_item_idx" ON "menu_item_variants" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE INDEX "menu_items_image_idx" ON "menu_items" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "message_replies_message_idx" ON "message_replies" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_status_created_idx" ON "messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "offers_image_idx" ON "offers" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "opening_exception_periods_exception_idx" ON "opening_exception_periods" USING btree ("exception_id");--> statement-breakpoint
CREATE INDEX "opening_exceptions_range_idx" ON "opening_exceptions" USING btree ("starts_on","ends_on");--> statement-breakpoint
CREATE INDEX "opening_periods_weekday_idx" ON "opening_periods" USING btree ("weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_events_user_created_idx" ON "security_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_prev_token_hash_idx" ON "sessions" USING btree ("prev_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trusted_devices_token_hash_key" ON "trusted_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "trusted_devices_user_idx" ON "trusted_devices" USING btree ("user_id");