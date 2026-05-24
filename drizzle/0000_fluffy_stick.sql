CREATE TYPE "public"."artwork_status" AS ENUM('available', 'sold', 'given', 'reserved');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artwork_tags" (
	"artwork_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "artwork_tags_artwork_id_tag_id_pk" PRIMARY KEY("artwork_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "artwork_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artwork_types_name_unique" UNIQUE("name"),
	CONSTRAINT "artwork_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "artworks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) DEFAULT 'Sans titre' NOT NULL,
	"description" text,
	"created_year" smallint,
	"created_month" smallint,
	"width_cm" numeric(6, 1),
	"height_cm" numeric(6, 1),
	"type_id" integer,
	"medium_id" integer,
	"status" "artwork_status" DEFAULT 'available' NOT NULL,
	"base_price" numeric(10, 2),
	"price_hours_spent" numeric(8, 2),
	"price_format" numeric(8, 2),
	"price_framing" numeric(8, 2),
	"price_materials" numeric(8, 2),
	"price_technicality" smallint,
	"price_attachment" smallint,
	"original_path" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mediums" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mediums_name_unique" UNIQUE("name"),
	CONSTRAINT "mediums_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"artwork_id" integer NOT NULL,
	"visitor_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"message" text,
	"below_floor" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_artworks" (
	"visitor_id" integer NOT NULL,
	"artwork_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_artworks_visitor_id_artwork_id_pk" PRIMARY KEY("visitor_id","artwork_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitors_phone_unique" UNIQUE("phone"),
	CONSTRAINT "visitors_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artwork_tags" ADD CONSTRAINT "artwork_tags_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artwork_tags" ADD CONSTRAINT "artwork_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_type_id_artwork_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."artwork_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_medium_id_mediums_id_fk" FOREIGN KEY ("medium_id") REFERENCES "public"."mediums"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_artworks" ADD CONSTRAINT "saved_artworks_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_artworks" ADD CONSTRAINT "saved_artworks_artwork_id_artworks_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artworks_status_idx" ON "artworks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "artworks_published_idx" ON "artworks" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "offers_artwork_idx" ON "offers" USING btree ("artwork_id");--> statement-breakpoint
CREATE INDEX "offers_visitor_idx" ON "offers" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "visitors_phone_idx" ON "visitors" USING btree ("phone");