import "server-only";

import { hash } from "@node-rs/argon2";
import { type z } from "zod";
import { type updateUserSchema, type createUserSchema } from "@/schema/users";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

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
