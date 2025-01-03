import { messages } from "@/server/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const createMessageSchema = createInsertSchema(messages, {
  friendId: () => z.string().min(1).max(255),
  message: () => z.string().min(1).max(255),
}).pick({
  friendId: true,
  message: true,
});

export const updateMessageSchema = z.object({
  id: z.string(),
  message: z.string().min(1).max(255),
  friendId: z.string().min(1).max(255),
});
