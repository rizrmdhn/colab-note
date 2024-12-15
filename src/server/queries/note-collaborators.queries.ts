import "server-only";

import { type z } from "zod";
import {
  type updateNoteCollaboratorSchema,
  type createNoteCollaboratorSchema,
} from "@/schema/note-collaborators";
import { and, eq } from "drizzle-orm";
import { db, type DBType } from "../db";
import { noteCollaborators } from "../db/schema";

export const getNoteCollaboratorsByNoteId = async (noteId: string) => {
  const noteCollaboratorsList = await db.query.noteCollaborators.findMany({
    where: eq(noteCollaborators.noteId, noteId),
    with: {
      users: true,
    },
  });

  return noteCollaboratorsList;
};

export const getNoteCollaboratorById = async (id: string) => {
  const noteCollaborator = await db.query.noteCollaborators.findFirst({
    where: eq(noteCollaborators.id, id),
  });

  return noteCollaborator;
};

export const getNoteCollaboratorByNoteIdAndUserId = async (
  noteId: string,
  userId: string,
) => {
  const noteCollaborator = await db.query.noteCollaborators.findFirst({
    where: and(
      eq(noteCollaborators.noteId, noteId),
      eq(noteCollaborators.userId, userId),
    ),
  });

  return noteCollaborator;
};

export const createNoteCollaborator = async (
  trx: DBType,
  data: z.input<typeof createNoteCollaboratorSchema>,
) => {
  const [noteCollaborator] = await trx
    .insert(noteCollaborators)
    .values(data)
    .returning()
    .execute();

  if (!noteCollaborator) {
    throw new Error("Failed to create note collaborator");
  }

  return noteCollaborator;
};

export const updateNoteCollaborator = async (
  id: string,
  data: z.input<typeof updateNoteCollaboratorSchema>,
) => {
  return await db.transaction(async (trx) => {
    const [noteCollaborator] = await trx
      .update(noteCollaborators)
      .set(data)
      .where(eq(noteCollaborators.id, id))
      .returning()
      .execute();

    if (!noteCollaborator) {
      throw new Error("Failed to update note collaborator");
    }

    return noteCollaborator;
  });
};

export const deleteNoteCollaborator = async (
  id: string,
  noteId: string,
  userId: string,
) => {
  return await db.transaction(async (trx) => {
    const noteCollaborator = await getNoteCollaboratorByNoteIdAndUserId(
      noteId,
      userId,
    );

    if (!noteCollaborator) {
      throw new Error("Note collaborator not found");
    }

    await trx
      .delete(noteCollaborators)
      .where(eq(noteCollaborators.id, id))
      .execute();

    return noteCollaborator;
  });
};
