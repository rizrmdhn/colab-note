import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import {
  createNoteCollaboratorSchema,
  updateNoteCollaboratorSchema,
} from "@/schema/note-collaborators";
import {
  createNoteCollaborator,
  deleteNoteCollaborator,
  getNoteCollaboratorsByNoteId,
  updateNoteCollaborator,
} from "@/server/queries/note-collaborators.queries";

export const noteCollaboratorsRouter = createTRPCRouter({
  getAllNoteCollaborators: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx }) => {
      const noteCollaborators = await getNoteCollaboratorsByNoteId(
        ctx.session.userId,
      );
      return noteCollaborators;
    }),

  create: protectedProcedure
    .input(createNoteCollaboratorSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (trx) => {
        return await createNoteCollaborator(trx, input);
      });
    }),

  update: protectedProcedure
    .input(updateNoteCollaboratorSchema)
    .mutation(async ({ input }) => {
      const updatedData = await updateNoteCollaborator(input.id, input);

      return updatedData;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), noteId: z.string(), userId: z.string() }))
    .mutation(async ({ input: { id, noteId, userId } }) => {
      const deleted = await deleteNoteCollaborator(id, noteId, userId);

      return deleted;
    }),
});
