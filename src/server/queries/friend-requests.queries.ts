import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { friendRequests } from "../db/schema";

export const getFriendRequestsByUserId = async (userId: string) => {
  const friendRequestsList = await db.query.friendRequests.findMany({
    where: or(
      eq(friendRequests.userId, userId),
      eq(friendRequests.friendId, userId),
    ),
    with: {
      users: true,
      friends: true,
    },
  });

  return friendRequestsList;
};

export const getRequestByUserId = async (userId: string) => {
  const friendRequestsList = await db.query.friendRequests.findFirst({
    where: or(
      eq(friendRequests.userId, userId),
      eq(friendRequests.friendId, userId),
    ),
  });

  return friendRequestsList;
};

export const insertFriendRequest = async (userId: string, friendId: string) => {
  const isExistingFriendRequest = await getRequestByUserId(userId);

  if (isExistingFriendRequest) {
    throw new Error(
      "Friend request already exists or you already have a friend request from this user.",
    );
  }

  const [data] = await db
    .insert(friendRequests)
    .values({
      userId,
      friendId,
    })
    .returning()
    .execute();

  if (!data) {
    throw new Error("Failed to insert friend request.");
  }

  // find the friend request
  const friendRequest = await db.query.friendRequests.findFirst({
    where: and(
      eq(friendRequests.userId, userId),
      eq(friendRequests.friendId, friendId),
    ),
    with: {
      users: true,
      friends: true,
    },
  });

  if (!friendRequest) {
    throw new Error("Failed to find friend request.");
  }

  return friendRequest;
};
