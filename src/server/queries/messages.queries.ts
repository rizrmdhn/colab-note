import "server-only";

import { type z } from "zod";
import {
  type updateMessageSchema,
  type createMessageSchema,
} from "@/schema/message";
import { and, asc, count, desc, eq, gt, or } from "drizzle-orm";
import { db } from "../db";
import { messages } from "../db/schema";
import { getFriendsByFriendIdOrUserId } from "./friends.queries";

export const getAllMessages = async (
  userId: string,
  friendId: string,
  createdAt: string | null,
) => {
  const messagesList = await db.query.messages.findMany({
    where: and(
      or(
        and(eq(messages.userId, userId), eq(messages.friendId, friendId)),
        and(eq(messages.userId, friendId), eq(messages.friendId, userId)),
      ),
      createdAt ? gt(messages.createdAt, createdAt) : undefined,
    ),
    orderBy: asc(messages.createdAt),
    with: {
      users: true,
      friends: true,
    },
  });

  return messagesList;
};

export const getAllMessagesByUserId = async (userId: string) => {
  const messagesList = await db.query.messages.findMany({
    where: or(eq(messages.userId, userId), eq(messages.friendId, userId)),
    orderBy: asc(messages.createdAt),
    with: {
      users: true,
      friends: true,
    },
  });

  return messagesList;
};

export const getMessageById = async (userId: string, id: string) => {
  const message = await db.query.messages.findFirst({
    where: and(
      or(eq(messages.userId, userId), eq(messages.friendId, userId)),
      eq(messages.id, id),
    ),
  });

  return message;
};

export const getMessageByIdOnly = async (id: string) => {
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });

  return message;
};

export const getLatestMessage = async (userId: string) => {
  const message = await db.query.messages.findFirst({
    where: or(eq(messages.userId, userId), eq(messages.friendId, userId)),
    orderBy: desc(messages.createdAt),
  });

  return message;
};

export const getMessageFullById = async (userId: string, id: string) => {
  const message = await db.query.messages.findFirst({
    where: and(
      or(eq(messages.userId, userId), eq(messages.friendId, userId)),
      eq(messages.id, id),
    ),
    with: {
      users: true,
      friends: true,
    },
  });

  return message;
};

export const countUnreadMessages = async (userId: string, friendId: string) => {
  const [unreadMessages] = await db
    .select({
      count: count(messages.isRead),
    })
    .from(messages)
    .where(
      and(
        eq(messages.userId, friendId),
        eq(messages.friendId, userId),
        eq(messages.isRead, false),
      ),
    )
    .execute();

  return unreadMessages ? unreadMessages.count : 0;
};

export const createMessage = async (
  userId: string,
  data: z.input<typeof createMessageSchema>,
) => {
  return await db.transaction(async (trx) => {
    const isUserInFriendList = await getFriendsByFriendIdOrUserId(
      userId,
      data.friendId,
    );

    if (!isUserInFriendList) {
      throw new Error("User is not in friend list");
    }

    const [message] = await trx
      .insert(messages)
      .values({
        ...data,
        userId,
      })
      .returning()
      .execute();

    if (!message) {
      throw new Error("Message not sent");
    }

    return message;
  });
};

export const updateMessage = async (
  userId: string,
  id: string,
  data: z.input<typeof updateMessageSchema>,
) => {
  return await db.transaction(async (trx) => {
    const isUserInFriendList = await getFriendsByFriendIdOrUserId(
      userId,
      data.friendId,
    );

    if (!isUserInFriendList) {
      throw new Error("User is not in friend list");
    }

    const message = await getMessageById(userId, id);

    if (!message) {
      throw new Error("Message not found");
    }

    const [updatedMessage] = await trx
      .update(messages)
      .set({
        ...data,
        isUpdated: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(messages.id, id))
      .returning()
      .execute();

    if (!updatedMessage) {
      throw new Error("Message not updated");
    }

    return updatedMessage;
  });
};

export const updateMessageReadStatus = async (userId: string, id: string) => {
  return await db.transaction(async (trx) => {
    const message = await getMessageById(userId, id);

    if (!message) {
      throw new Error("Message not found");
    }

    const [updatedMessage] = await trx
      .update(messages)
      .set({
        isRead: true,
      })
      .where(eq(messages.id, id))
      .returning()
      .execute();

    if (!updatedMessage) {
      throw new Error("Message not updated");
    }

    return updatedMessage;
  });
};

export const deleteMessage = async (userId: string, id: string) => {
  return await db.transaction(async (trx) => {
    const message = await getMessageById(userId, id);

    if (!message) {
      throw new Error("Message not found");
    }

    await trx
      .delete(messages)
      .where(and(eq(messages.id, id), eq(messages.userId, userId)))
      .execute();

    return message;
  });
};
