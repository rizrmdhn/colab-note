import "server-only";

import { type z } from "zod";
import { type updateNoteSchema, type createNoteSchema } from "@/schema/notes";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { notes } from "../db/schema";
import { createNoteCollaborator } from "./note-collaborators.queries";

export const getAllNotes = async (userId: string) => {
  const notesList = await db.query.notes.findMany({
    where: eq(notes.userId, userId),
    orderBy: asc(notes.createdAt),
  });

  return notesList;
};

export const getNoteById = async (userId: string, id: string) => {
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.userId, userId), eq(notes.id, id)),
  });

  return note;
};

export const createNotes = async (
  userId: string,
  data: z.input<typeof createNoteSchema>,
) => {
  return await db.transaction(async (trx) => {
    const [note] = await trx
      .insert(notes)
      .values({
        ...data,
        userId,
      })
      .returning()
      .execute();

    if (!note) {
      throw new Error("Failed to create note");
    }

    await createNoteCollaborator(trx, {
      noteId: note.id,
      userId,
      type: "admin",
    });

    return note;
  });
};

export const updateNotesTitle = async (
  userId: string,
  id: string,
  title: string,
) => {
  return await db.transaction(async (trx) => {
    const isNoteExist = await getNoteById(userId, id);

    if (!isNoteExist) {
      throw new Error("Note not found");
    }

    const [note] = await trx
      .update(notes)
      .set({
        title,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning()
      .execute();

    if (!note) {
      throw new Error("Failed to update note title");
    }

    return note;
  });
};

export const updateNote = async (
  userId: string,
  id: string,
  data: z.input<typeof updateNoteSchema>,
) => {
  return await db.transaction(async (trx) => {
    const isNoteExist = await getNoteById(userId, id);

    if (!isNoteExist) {
      throw new Error("Note not found");
    }

    const [note] = await trx
      .update(notes)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning()
      .execute();

    if (!note) {
      throw new Error("Failed to update note");
    }

    return note;
  });
};

export const deleteNote = async (userId: string, id: string) => {
  return await db.transaction(async (trx) => {
    const isNoteExist = await getNoteById(userId, id);

    if (!isNoteExist) {
      throw new Error("Note not found");
    }

    const [note] = await trx
      .delete(notes)
      .where(and(eq(notes.userId, userId), eq(notes.id, id)))
      .returning()
      .execute();

    if (!note) {
      throw new Error("Failed to delete note");
    }

    return note;
  });
};
