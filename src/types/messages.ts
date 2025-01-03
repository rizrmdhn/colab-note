import type { InferQueryModel } from "./utils";

export type Message = InferQueryModel<
  "messages",
  {
    with: {
      users: true;
      friends: true;
    };
  }
>;

export type OnlyMessage = InferQueryModel<"messages">;
