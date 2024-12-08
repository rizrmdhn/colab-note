import type { InferSelectModel } from "drizzle-orm";
import type { OnlyMessage } from "./messages";
import type { Users } from "./users";
import type { friends } from "@/server/db/schema";

export type Friend = InferSelectModel<typeof friends>;

// Define the combined friend data structure
export type FriendWithDetails = {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
  latestMessage: OnlyMessage | null;
  users: Users; // The user's details
  friends: Users;
};
