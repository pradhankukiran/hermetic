CREATE TYPE "public"."sleeper_status" AS ENUM('asleep', 'released', 'revoked');--> statement-breakpoint
CREATE TABLE "sleepers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"cid" text NOT NULL,
	"status" "sleeper_status" DEFAULT 'asleep' NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sleepers" ADD CONSTRAINT "sleepers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;