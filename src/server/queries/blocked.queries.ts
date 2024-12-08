import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { blocked } from "../db/schema";

export const getBlockedByUserId = async (userId: string) => {
  const blockedList = await db.query.blocked.findMany({
    where: eq(blocked.userId, userId),
  });

  return blockedList;
};

export const getBlockedByBlockedId = async (blockedId: string) => {
  const blockedList = await db.query.blocked.findFirst({
    where: eq(blocked.blockedId, blockedId),
  });

  return blockedList;
};

export const insertBlocked = async (userId: string, blockedId: string) => {
  await db.transaction(async (trx) => {
    const isBlockedExists = await getBlockedByBlockedId(blockedId);

    if (isBlockedExists) {
      throw new Error("Blocked user already exists");
    }

    const [blockedUser] = await trx
      .insert(blocked)
      .values({
        userId,
        blockedId,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute();

    if (!blockedUser) {
      throw new Error("Failed to block user");
    }

    return blockedUser;
  });
};

export const deleteBlocked = async (userId: string, blockedId: string) => {
  await db.transaction(async (trx) => {
    const isBlockedExists = await getBlockedByBlockedId(blockedId);

    if (!isBlockedExists) {
      throw new Error("Blocked user not exists");
    }

    await trx
      .delete(blocked)
      .where(and(eq(blocked.userId, userId), eq(blocked.blockedId, blockedId)))
      .execute();
  });
};
