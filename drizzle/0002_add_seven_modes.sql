CREATE TYPE "public"."mirror_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."pact_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."sleeper_status" AS ENUM('asleep', 'released', 'revoked');--> statement-breakpoint
CREATE TABLE "beacons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"owner_id" uuid,
	"target_height" bigint NOT NULL,
	"chain_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "echo_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"echo_id" uuid NOT NULL,
	"cid" text NOT NULL,
	"bidder_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "echoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"drand_round" bigint NOT NULL,
	"drand_chain_hash" text NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mirrors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"holder_a_email_hash" "bytea" NOT NULL,
	"holder_b_email_hash" "bytea" NOT NULL,
	"status" "mirror_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "sleepers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"cid" text NOT NULL,
	"status" "sleeper_status" DEFAULT 'asleep' NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beacons" ADD CONSTRAINT "beacons_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "echo_bids" ADD CONSTRAINT "echo_bids_echo_id_echoes_id_fk" FOREIGN KEY ("echo_id") REFERENCES "public"."echoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pact_members" ADD CONSTRAINT "pact_members_pact_id_pacts_id_fk" FOREIGN KEY ("pact_id") REFERENCES "public"."pacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacts" ADD CONSTRAINT "pacts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleepers" ADD CONSTRAINT "sleepers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "echo_bids_echo_idx" ON "echo_bids" USING btree ("echo_id");--> statement-breakpoint
CREATE INDEX "pact_members_pact_idx" ON "pact_members" USING btree ("pact_id");