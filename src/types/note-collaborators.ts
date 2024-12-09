import type { InferQueryModel } from "./utils";

export type NoteCollaborator = InferQueryModel<
  "noteCollaborators",
  {
    with: {
      users: true;
    };
  }
>;
