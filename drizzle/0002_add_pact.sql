CREATE TYPE "public"."pact_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "pact_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pact_id" uuid NOT NULL,
	"email" text NOT NULL,
	"email_hash" "bytea" NOT NULL,
	"share_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"cid" text NOT NULL,
	"party_count_n" integer NOT NULL,
	"status" "pact_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pact_members" ADD CONSTRAINT "pact_members_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pact_members_pact_idx" ON "pact_members" USING btree ("pact_id");--> statement-breakpoint
CREATE INDEX "pact_members_email_idx" ON "pact_members" USING btree ("email_hash");