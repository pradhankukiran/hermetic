CREATE TYPE "public"."auth_token_kind" AS ENUM('magic_link');--> statement-breakpoint
CREATE TYPE "public"."switch_status" AS ENUM('active', 'triggered', 'revoked');--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "auth_token_kind" DEFAULT 'magic_link' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capsules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"owner_id" uuid,
	"unlock_at" timestamp with time zone NOT NULL,
	"drand_round" bigint NOT NULL,
	"drand_chain_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cid" text NOT NULL,
	"owner_id" uuid,
	"view_limit" integer,
	"view_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"burned_at" timestamp with time zone,
	CONSTRAINT "drops_cid_unique" UNIQUE("cid")
);
--> statement-breakpoint
CREATE TABLE "switch_trustees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"switch_id" uuid NOT NULL,
	"email_hash" "bytea" NOT NULL,
	"share_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "switches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"cid" text NOT NULL,
	"threshold_k" integer NOT NULL,
	"share_count_n" integer NOT NULL,
	"inactivity_seconds" integer NOT NULL,
	"last_checkin_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "switch_status" DEFAULT 'active' NOT NULL,
	"triggered_at" timestamp with time zone,
	"trustees_notified_at" timestamp with time zone,
	"warning_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capsules" ADD CONSTRAINT "capsules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drops" ADD CONSTRAINT "drops_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "switch_trustees" ADD CONSTRAINT "switch_trustees_switch_id_switches_id_fk" FOREIGN KEY ("switch_id") REFERENCES "public"."switches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "switches" ADD CONSTRAINT "switches_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_tokens_token_hash_idx" ON "auth_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "switch_trustees_switch_idx" ON "switch_trustees" USING btree ("switch_id");--> statement-breakpoint
CREATE INDEX "switch_trustees_email_idx" ON "switch_trustees" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "users_email_hash_idx" ON "users" USING btree ("email_hash");