ALTER TABLE "blocked" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "friends" ADD COLUMN "id" uuid PRIMARY KEY NOT NULL;