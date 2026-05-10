CREATE TYPE "public"."mirror_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "mirrors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"holder_a_email_hash" "bytea" NOT NULL,
	"holder_b_email_hash" "bytea" NOT NULL,
	"status" "mirror_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
