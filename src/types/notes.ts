import { type notes } from "@/server/db/schema";
import { type InferSelectModel } from "drizzle-orm";

export type Notes = InferSelectModel<typeof notes>;
