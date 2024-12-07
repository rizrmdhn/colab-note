import { users } from "@/server/db/schema";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const createUserSchema = createInsertSchema(users, {
  name: () => z.string().min(1).max(255),
  email: () => z.string().email().min(1).max(255),
  password: () => z.string().min(8).max(255),
  username: () =>
    z
      .string()
      .regex(/^[a-zA-Z]+$/)
      .min(1)
      .max(255),
}).pick({
  name: true,
  email: true,
  username: true,
  password: true,
});

export const updateUserSchema = createInsertSchema(users, {
  name: () => z.string().min(1).max(255),
  password: () => z.string().min(8).max(255),
  avatar: () => z.string().min(1).max(255),
  email: () => z.string().email(),
}).pick({
  name: true,
  email: true,
  password: true,
  avatar: true,
});
