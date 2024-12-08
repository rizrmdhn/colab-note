import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { friends } from "../db/schema";
import { getBlockedByBlockedId } from "./blocked.queries";

export const getFriendsByUserId = async (userId: string) => {
  const friendsList = await db.query.friends.findMany({
    where: or(eq(friends.userId, userId), eq(friends.friendId, userId)),
    with: {
      users: true,
      friends: true,
    },
  });

  return friendsList;
};

export const getFriendsByFriendId = async (friendId: string) => {
  const friendsList = await db.query.friends.findFirst({
    where: eq(friends.friendId, friendId),
  });

  return friendsList;
};

export const getFriendsByFriendIdOrUserId = async (
  userId: string,
  friendId: string,
) => {
  const friendsList = await db.query.friends.findFirst({
    where: or(
      and(eq(friends.userId, userId), eq(friends.friendId, friendId)),
      and(eq(friends.userId, friendId), eq(friends.friendId, userId)),
    ),
  });

  return friendsList;
};

export const getFriendsById = async (userId: string, id: string) => {
  const friendsList = await db.query.friends.findFirst({
    where: and(
      or(eq(friends.userId, userId), eq(friends.friendId, userId)),
      eq(friends.id, id),
    ),
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

export const deleteFriend = async (userId: string, id: string) => {
  return await db.transaction(async (trx) => {
    const isFriendExists = await getFriendsById(userId, id);

    if (!isFriendExists) {
      throw new Error("Friend not exists");
    }

    const [data] = await trx
      .delete(friends)
      .where(
        and(
          or(eq(friends.userId, userId), eq(friends.friendId, userId)),
          eq(friends.id, id),
        ),
      )
      .returning()
      .execute();

    if (!data) {
      throw new Error("Failed to delete friend");
    }

    return data;
  });
};
