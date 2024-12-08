import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { friendRequests, friends } from "../db/schema";

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

export const getRequestListByUserId = async (userId: string) => {
  const friendRequestsList = await db.query.friendRequests.findMany({
    where: eq(friendRequests.friendId, userId),
    with: {
      users: true,
      friends: true,
    },
  });

  return friendRequestsList;
};

export const insertFriendRequest = async (userId: string, friendId: string) => {
  return await db.transaction(async (trx) => {
    const isExistingFriendRequest = await getRequestByUserId(userId);

    if (isExistingFriendRequest) {
      throw new Error(
        "Friend request already exists or you already have a friend request from this user.",
      );
    }

    const [data] = await trx
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
    const friendRequest = await trx.query.friendRequests.findFirst({
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
  });
};

export const acceptFriendRequestById = async (id: string, userId: string) => {
  return await db.transaction(async (trx) => {
    const friendRequest = await trx.query.friendRequests.findFirst({
      where: and(
        eq(friendRequests.id, id),
        eq(friendRequests.friendId, userId),
      ),
    });

    if (!friendRequest) {
      throw new Error("Friend request not found.");
    }

    const [data] = await trx
      .insert(friends)
      .values({
        userId: friendRequest.userId,
        friendId: friendRequest.friendId,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute();

    if (!data) {
      throw new Error("Failed to insert friend.");
    }

    await trx.delete(friendRequests).where(eq(friendRequests.id, id)).execute();

    return data;
  });
};
