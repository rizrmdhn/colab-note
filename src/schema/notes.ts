import { notes } from "@/server/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const createNoteSchema = createInsertSchema(notes, {
  title: () => z.string().min(1).max(255),
  content: () => z.string().min(1).max(10000),
}).pick({
  title: true,
  content: true,
});

export const updateNoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(10000),
});
