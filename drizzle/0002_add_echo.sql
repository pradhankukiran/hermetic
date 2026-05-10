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
ALTER TABLE "echo_bids" ADD CONSTRAINT "echo_bids_echo_id_echoes_id_fk" FOREIGN KEY ("echo_id") REFERENCES "public"."echoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "echo_bids_echo_idx" ON "echo_bids" USING btree ("echo_id");