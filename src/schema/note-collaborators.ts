import { AVALIABLE_COLLABORATOR_TYPE } from "@/lib/constants";
import { noteCollaborators } from "@/server/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const createNoteCollaboratorSchema = createInsertSchema(
  noteCollaborators,
  {
    noteId: () => z.string().min(1).max(255),
    userId: () => z.string().min(1).max(255),
    type: () => z.enum(AVALIABLE_COLLABORATOR_TYPE),
  },
).pick({
  noteId: true,
  userId: true,
  type: true,
});

export const updateNoteCollaboratorSchema = z.object({
  id: z.string(),
  type: z.enum(AVALIABLE_COLLABORATOR_TYPE),
});
