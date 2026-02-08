CREATE TYPE "public"."end_reason" AS ENUM('checkmate', 'timeout', 'resignation', 'stalemate', 'draw_agreement', 'insufficient_material', 'fifty_move', 'threefold_repetition', 'disconnect');--> statement-breakpoint
CREATE TYPE "public"."game_difficulty" AS ENUM('easy', 'medium', 'difficult');--> statement-breakpoint
CREATE TYPE "public"."game_result" AS ENUM('white_wins', 'black_wins', 'draw');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('waiting', 'active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('vs_computer', 'pvp');--> statement-breakpoint
CREATE TYPE "public"."player_color" AS ENUM('white', 'black');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('signup_bonus', 'game_stake', 'game_win', 'game_draw', 'game_lose', 'weekly_bonus', 'admin_adjust');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"white_player_id" uuid,
	"black_player_id" uuid,
	"game_type" "game_type" NOT NULL,
	"difficulty" "game_difficulty",
	"time_control_base" integer NOT NULL,
	"time_control_increment" integer DEFAULT 0 NOT NULL,
	"stake_amount" integer DEFAULT 1 NOT NULL,
	"stakes_collected" boolean DEFAULT false,
	"stakes_settled" boolean DEFAULT false,
	"status" "game_status" DEFAULT 'active',
	"result" "game_result",
	"winner_id" uuid,
	"end_reason" "end_reason",
	"initial_board" jsonb NOT NULL,
	"current_board" jsonb,
	"final_board" jsonb,
	"white_knight_positions" text NOT NULL,
	"black_knight_positions" text NOT NULL,
	"white_time_remaining" integer,
	"black_time_remaining" integer,
	"move_count" integer DEFAULT 0,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"move_number" integer NOT NULL,
	"player" "player_color" NOT NULL,
	"from_square" varchar(3) NOT NULL,
	"to_square" varchar(3) NOT NULL,
	"piece" varchar(10) NOT NULL,
	"captured" varchar(10),
	"promotion" varchar(10),
	"is_check" boolean DEFAULT false,
	"is_checkmate" boolean DEFAULT false,
	"is_castling" varchar(10),
	"is_en_passant" boolean DEFAULT false,
	"notation" varchar(10) NOT NULL,
	"time_spent_ms" integer,
	"time_remaining_ms" integer,
	"board_state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_before" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"game_id" uuid,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"board_theme" varchar(50) DEFAULT 'classic',
	"piece_set" varchar(50) DEFAULT 'standard',
	"sound_enabled" boolean DEFAULT true,
	"sound_volume" integer DEFAULT 70,
	"show_legal_moves" boolean DEFAULT true,
	"show_coordinates" boolean DEFAULT true,
	"auto_promote_queen" boolean DEFAULT false,
	"enable_premoves" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"token_balance" integer DEFAULT 1000 NOT NULL,
	"total_tokens_won" integer DEFAULT 0 NOT NULL,
	"total_tokens_lost" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 1200 NOT NULL,
	"total_games" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"current_week_start" varchar(10),
	"days_played_this_week" text DEFAULT '',
	"weekly_bonus_earned" integer DEFAULT 0 NOT NULL,
	"games_today" integer DEFAULT 0 NOT NULL,
	"last_game_date" varchar(10),
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_users_id_fk" FOREIGN KEY ("white_player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_users_id_fk" FOREIGN KEY ("black_player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;