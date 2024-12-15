import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { createNoteSchema, updateNoteSchema } from "@/schema/notes";
import {
  createNotes,
  deleteNote,
  getAllNotesWithCollaborators,
  getNoteById,
  updateNote,
  updateNotesTitle,
} from "@/server/queries/notes.queries";
import { getNoteCollaboratorByNoteIdAndUserId } from "@/server/queries/note-collaborators.queries";
import { ee } from "@/lib/event-emitter";
import type { Node } from "slate";
import type { CursorPosition } from "@/types/cursor-position";
import { tracked } from "@trpc/server";

export const noteRouter = createTRPCRouter({
  getAllNotes: protectedProcedure.query(async ({ ctx }) => {
    const notes = await getAllNotesWithCollaborators(ctx.session.userId);

    return notes;
  }),

  getUserPermissions: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const notes = await getNoteCollaboratorByNoteIdAndUserId(
        input.id,
        ctx.session.userId,
      );

      if (!notes) {
        throw new Error("Note not found");
      }

      return notes;
    }),

  getNoteDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // check if note exists in collaboration
      const collaboration = await getNoteCollaboratorByNoteIdAndUserId(
        input.id,
        ctx.session.userId,
      );

      if (!collaboration) {
        throw new Error("Note not found");
      }

      const note = await getNoteById(input.id);

      if (!note) {
        throw new Error("Note not found");
      }

      return note;
    }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ input, ctx }) => {
      const note = await createNotes(ctx.session.userId, input);

      return note;
    }),

  sendNoteChanges: protectedProcedure
    .input(z.object({ id: z.string(), update: z.any() }))
    .mutation(async ({ input, ctx }) => {
      ee.emit("notesChanges", ctx.session.userId, input.id, input.update);
      return true;
    }),

  subscribeToRealtimeNoteChanges: protectedProcedure
    .input(z.object({ id: z.string() }))
    .subscription(async function* ({ input, ctx, signal }) {
      const iterable = ee.toIterable("notesChanges", { signal });

      function* maybeYield(userId: string, noteId: string, update: Node[]) {
        if (userId === ctx.session.userId) return;
        if (noteId !== input.id) return;

        yield tracked(noteId, { type: "note" as const, update });
      }

      for await (const [userId, noteId, update] of iterable) {
        yield* maybeYield(userId, noteId, update);
      }
    }),

  updateCursorPosition: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        noteId: z.string(),
        username: z.string(),
        x: z.number(),
        y: z.number(),
        lastUpdate: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      ee.emit("cursorPosition", ctx.session.userId, input.noteId, input);
      return true;
    }),

  subscribeToRealtimeCursorPosition: protectedProcedure
    .input(z.object({ id: z.string() }))
    .subscription(async function* ({ input, ctx, signal }) {
      const iterable = ee.toIterable("cursorPosition", { signal });

      function* maybeYield(
        userId: string,
        noteId: string,
        position: CursorPosition,
      ) {
        if (userId === ctx.session.userId) return;
        if (noteId !== input.id) return;

        yield tracked(noteId, {
          type: "cursor" as const,
          position,
        });
      }

      for await (const [userId, noteId, position] of iterable) {
        yield* maybeYield(userId, noteId, position);
      }
    }),

  disconnectCursor: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      ee.off("cursorPosition", (userId, _, __) => {
        return userId === input.userId;
      });
      return true;
    }),

  subscribeToRealtimeDisconnectCursor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .subscription(async function* ({ input, ctx, signal }) {
      const iterable = ee.toIterable("cursorPosition", { signal });

      function* maybeYield(
        userId: string,
        noteId: string,
        position: CursorPosition,
      ) {
        if (userId === ctx.session.userId) return;
        if (noteId !== input.id) return;

        yield tracked(noteId, {
          type: "cursor" as const,
          position,
        });
      }

      for await (const [userId, noteId, position] of iterable) {
        yield* maybeYield(userId, noteId, position);
      }
    }),

  updateTitle: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const note = await updateNotesTitle(
        ctx.session.userId,
        input.id,
        input.title,
      );

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
