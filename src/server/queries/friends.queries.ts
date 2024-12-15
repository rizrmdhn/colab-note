import "server-only";

import { aliasedTable, and, desc, eq, ne, or } from "drizzle-orm";
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
  const userData = aliasedTable(users, "userData");
  const readedMessages = aliasedTable(messages, "readedMessages");
  const friendsWithMessages = await db
    .select({
      friend: friends,
      users: userData, // Current user data
      friends: friendData, // Friend's data
      latestMessage: messages,
      readedMessages: readedMessages,
    })
    .from(friends)
    // Join for current user's data
    .innerJoin(userData, eq(userData.id, userId))
    // Join for friend's data with corrected conditions
    .innerJoin(
      friendData,
      and(
        or(
          eq(friends.friendId, friendData.id),
          eq(friends.userId, friendData.id),
        ),
        ne(friendData.id, userId), // Ensure we're getting the other user's data
      ),
    )
    .leftJoin(
      messages,
      and(
        or(
          // Current user sent the message
          and(
            eq(messages.userId, userId),
            or(
              eq(messages.friendId, friends.friendId),
              eq(messages.friendId, friends.userId),
            ),
          ),
          // Friend sent the message
          and(
            or(
              eq(messages.userId, friends.friendId),
              eq(messages.userId, friends.userId),
            ),
            eq(messages.friendId, userId),
          ),
        ),
      ),
    )
    .leftJoin(
      readedMessages,
      and(
        eq(readedMessages.userId, userId),
        or(
          eq(readedMessages.friendId, friends.friendId),
          eq(readedMessages.friendId, friends.userId),
        ),
        eq(readedMessages.id, messages.id),
      ),
    )
    .where(or(eq(friends.userId, userId), eq(friends.friendId, userId)))
    .orderBy(desc(messages.createdAt));

  const friendsWithDetails: FriendWithDetails[] = [];
  for (const row of friendsWithMessages) {
    const friendId =
      row.friend.userId === userId ? row.friend.friendId : row.friend.userId;

    if (!friendsWithDetails.some((friend) => friend.friendId === friendId)) {
      const unreadCount = await countUnreadMessages(userId, friendId);
      const isMessageFromFriend = row.latestMessage?.userId === friendId;

      friendsWithDetails.push({
        id: row.friend.id,
        userId: userId,
        friendId: friendId,
        createdAt: row.friend.createdAt,
        latestMessage: row.latestMessage,
        users: row.users, // Will always be current user's data
        friends: row.friends, // Will always be friend's data
        unreadCount,
        isMessageFromFriend,
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
