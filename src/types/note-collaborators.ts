import { type InferSelectModel } from "drizzle-orm";
import type { InferQueryModel } from "./utils";
import { type noteCollaborators } from "@/server/db/schema";

export type NoteCollaborator = InferQueryModel<
  "noteCollaborators",
  {
    with: {
      users: true;
    };
  }
>;

export type PlainNoteCollaborator = InferSelectModel<typeof noteCollaborators>;
