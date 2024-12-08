import "server-only";

import { hash } from "@node-rs/argon2";
import { type z } from "zod";
import { type updateUserSchema, type createUserSchema } from "@/schema/users";
import { and, eq, exists, not, or } from "drizzle-orm";
import { db } from "../db";
import { users, friends, friendRequests, blocked } from "../db/schema";

export const getAllUsers = async (userId: string) => {
  const usersList = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      name: users.name,
      avatar: users.avatar,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    // Exclude current user
    .where(
      and(
        // Exclude the current user
        not(eq(users.id, userId)),
        // Exclude users who are friends
        not(
          exists(
            db
              .select()
              .from(friends)
              .where(
                or(
                  and(
                    eq(friends.userId, userId),
                    eq(friends.friendId, users.id),
                  ),
                  and(
                    eq(friends.friendId, userId),
                    eq(friends.userId, users.id),
                  ),
                ),
              ),
          ),
        ),
        // Exclude users with pending friend requests
        not(
          exists(
            db
              .select()
              .from(friendRequests)
              .where(
                or(
                  and(
                    eq(friendRequests.userId, userId),
                    eq(friendRequests.friendId, users.id),
                  ),
                  and(
                    eq(friendRequests.friendId, userId),
                    eq(friendRequests.userId, users.id),
                  ),
                ),
              ),
          ),
        ),
        // Exclude blocked users (in either direction)
        not(
          exists(
            db
              .select()
              .from(blocked)
              .where(
                or(
                  and(
                    eq(blocked.userId, userId),
                    eq(blocked.blockedId, users.id),
                  ),
                  and(
                    eq(blocked.blockedId, userId),
                    eq(blocked.userId, users.id),
                  ),
                ),
              ),
          ),
        ),
      ),
    )
    .execute();

  return usersList;
};

export const getUserByUsername = async (username: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  return user;
};

export const getUserByEmail = async (email: string) => {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  return user;
};

export const insertUser = async (data: z.infer<typeof createUserSchema>) => {
  await db.transaction(async (trx) => {
    const isEmailExists = await getUserByEmail(data.email);

    if (isEmailExists) {
      throw new Error("Email already used please use another email");
    }

    const isUsernameExists = await getUserByUsername(data.username);

    if (isUsernameExists) {
      throw new Error("Username already used please use another username");
    }

    const [user] = await trx
      .insert(users)
      .values({
        email: data.email,
        password: await hash(data.password),
        username: data.username,
        name: data.name,
        createdAt: new Date().toISOString(),
      })
      .returning()
      .execute();

    if (!user) {
      throw new Error("Failed to create user");
    }

    return user;
  });
};

export const updateUser = async (
  userId: string,
  data: z.infer<typeof updateUserSchema>,
) => {
  await db.transaction(async (trx) => {
    const isEmailExists = await getUserByEmail(data.email);

    if (isEmailExists) {
      throw new Error("Email already used please use another email");
    }

    const [user] = await trx
      .update(users)
      .set({
        email: data.email,
        password: await hash(data.password),
        name: data.name,
        avatar: data.avatar,
        createdAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning()
      .execute();

    if (!user) {
      throw new Error("Failed to update user");
    }

    return user;
  });
};
