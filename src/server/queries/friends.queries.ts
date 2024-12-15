import "server-only";

import { aliasedTable, and, desc, eq, or } from "drizzle-orm";
import { db } from "../db";
import { friends, messages, users } from "../db/schema";
import { getBlockedByBlockedId } from "./blocked.queries";
import type { FriendWithDetails } from "@/types/friend";
import { countUnreadMessages } from "./messages.queries";

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

export const getFriendsByUserIdOrderByMessageCreatedAt = async (
  userId: string,
) => {
  const friendData = aliasedTable(users, "friendData");
  const readedMessages = aliasedTable(messages, "readedMessages");
  const friendsWithMessages = await db
    .select({
      friend: friends,
      users: users,
      friends: friendData,
      latestMessage: messages,
      readedMessages: readedMessages,
    })
    .from(friends)
    .innerJoin(users, eq(users.id, userId))
    .innerJoin(
      friendData,
      or(
        and(
          eq(friends.friendId, friendData.id),
          eq(friends.userId, userId), // When user is initiator
        ),
        and(
          eq(friends.userId, friendData.id),
          eq(friends.friendId, userId), // When user is friend
        ),
      ),
    )
    .innerJoin(
      messages,
      and(
        // Changed this part to only get messages FROM the friend
        or(
          and(
            eq(messages.userId, friendData.id), // Friend is sender
            eq(messages.friendId, userId), // User is receiver
          ),
        ),
      ),
    )
    .innerJoin(
      readedMessages,
      and(
        eq(readedMessages.userId, userId),
        eq(readedMessages.friendId, friendData.id),
        eq(readedMessages.id, messages.id),
      ),
    )
    .where(or(eq(friends.userId, userId), eq(friends.friendId, userId)))
    .orderBy(desc(messages.createdAt));

  const friendsWithDetails: FriendWithDetails[] = [];
  for (const row of friendsWithMessages) {
    const isUserTheInitiator = row.friend.userId === userId;
    const isUserTheFriend = row.friend.friendId === userId;
    const friendId = isUserTheInitiator
      ? row.friend.friendId
      : isUserTheFriend
        ? row.friend.userId
        : null;

    if (
      friendId &&
      !friendsWithDetails.some((friend) => friend.friendId === friendId)
    ) {
      const unreadCount = await countUnreadMessages(userId, friendId);
      friendsWithDetails.push({
        id: row.friend.id,
        userId: userId,
        friendId: friendId,
        createdAt: row.friend.createdAt,
        latestMessage: row.latestMessage,
        users: row.users,
        friends: row.friends,
        unreadCount,
      });
    }
  }
  return friendsWithDetails;
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
