CREATE TYPE "public"."matchmaking_queue_status" AS ENUM('waiting', 'matched', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "matchmaking_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "matchmaking_queue_status" DEFAULT 'waiting' NOT NULL,
	"rating" integer NOT NULL,
	"game_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"matched_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD CONSTRAINT "matchmaking_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD CONSTRAINT "matchmaking_queue_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;