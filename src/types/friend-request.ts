import type { InferInsertModel } from "drizzle-orm";
import { type InferQueryModel } from "./utils";
import type { friendRequests } from "@/server/db/schema";

export type FriendRequest = InferQueryModel<
  "friendRequests",
  {
    with: {
      users: true;
      friends: true;
    };
  }
>;

export type InsertFriendRequest = InferInsertModel<typeof friendRequests>;
