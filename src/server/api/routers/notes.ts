import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { createNoteSchema, updateNoteSchema } from "@/schema/notes";
import {
  createNotes,
  deleteNote,
  getAllNotes,
  updateNote,
} from "@/server/queries/notes.queries";

export const noteRouter = createTRPCRouter({
  getAllNotes: protectedProcedure.query(async ({ ctx }) => {
    const notes = await getAllNotes(ctx.session.userId);

    return notes;
  }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ input, ctx }) => {
      const note = await createNotes(ctx.session.userId, input);

      return note;
    }),

  update: protectedProcedure
    .input(updateNoteSchema)
    .mutation(async ({ input, ctx }) => {
      const note = await updateNote(ctx.session.userId, input.id, input);

      return note;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const note = await deleteNote(ctx.session.userId, input.id);

      return note;
    }),
});
