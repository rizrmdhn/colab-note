import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { friends } from "../db/schema";
import { getBlockedByBlockedId } from "./blocked.queries";

export const getFriendsByUserId = async (userId: string) => {
  const friendsList = await db.query.friends.findMany({
    where: eq(friends.userId, userId),
  });

  return friendsList;
};

export const getFriendsByFriendId = async (friendId: string) => {
  const friendsList = await db.query.friends.findFirst({
    where: eq(friends.friendId, friendId),
  });

  return friendsList;
};

export const insertFriend = async (userId: string, friendId: string) => {
  await db.transaction(async (trx) => {
    const [isFriendExists, isUserBlocked] = await Promise.all([
      getFriendsByFriendId(friendId),
      getBlockedByBlockedId(friendId),
    ]);

    if (isFriendExists) {
      throw new Error("Friend already exists");
    }

    if (isUserBlocked) {
      throw new Error(
        "User is blocked cannot add as friend please unblock first",
      );
    }

    const [friend] = await trx
      .insert(friends)
      .values({
        userId,
        friendId,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute();

    if (!friend) {
      throw new Error("Failed to create friend");
    }

    return friend;
  });
};

export const deleteFriend = async (userId: string, friendId: string) => {
  await db.transaction(async (trx) => {
    const isFriendExists = await getFriendsByFriendId(friendId);

    if (!isFriendExists) {
      throw new Error("Friend not exists");
    }

    await trx
      .delete(friends)
      .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)))
      .execute();
  });
};
