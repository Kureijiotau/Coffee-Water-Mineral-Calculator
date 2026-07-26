CREATE TABLE "waters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"ions" jsonb NOT NULL,
	"shared" text DEFAULT 'no' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
