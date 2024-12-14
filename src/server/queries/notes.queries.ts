import "server-only";

import { type z } from "zod";
import { type updateNoteSchema, type createNoteSchema } from "@/schema/notes";
import { and, asc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { noteCollaborators, notes } from "../db/schema";
import { createNoteCollaborator } from "./note-collaborators.queries";

export const getAllNotes = async (userId: string) => {
  const notesList = await db.query.notes.findMany({
    where: eq(notes.userId, userId),
    columns: {
      id: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      isDeleted: true,
      title: true,
      content: false,
    },
    orderBy: asc(notes.createdAt),
  });

  return notesList;
};

export const getAllNotesWithCollaborators = async (userId: string) => {
  const notesList = await db
    .selectDistinct({
      id: notes.id,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      userId: notes.userId,
      isDeleted: notes.isDeleted,
      title: notes.title,
      content: notes.content,
    })
    .from(notes)
    .leftJoin(noteCollaborators, eq(noteCollaborators.noteId, notes.id))
    .where(or(eq(notes.userId, userId), eq(noteCollaborators.userId, userId)))
    .execute();

  return notesList;
};

export const getNoteById = async (id: string) => {
  const note = await db.query.notes.findFirst({
    where: eq(notes.id, id),
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
        title: data.title,
        content: JSON.parse(data.content),
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
    const isNoteExist = await getNoteById(id);

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
    const isNoteExist = await getNoteById(id);

    if (!isNoteExist) {
      throw new Error("Note not found");
    }

    const [note] = await trx
      .update(notes)
      .set({
        title: data.title,
        content: JSON.parse(data.content),
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
    const isNoteExist = await getNoteById(id);

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
