import { type session } from "@/server/db/schema";
import { type InferSelectModel } from "drizzle-orm";
import { type Users } from "./users";

export type Session = InferSelectModel<typeof session>;

export type SessionValidationResult =
  | { session: Session; user: Users }
  | { session: null; user: null };
