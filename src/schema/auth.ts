import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { users } from "@/server/db/schema";

export const loginSchema = z.object({
  username: z
    .string()
    .regex(/^[a-zA-Z]+$/)
    .min(1)
    .max(255),
  password: z.string().min(8).max(255),
});

export const registerSchema = createInsertSchema(users, {
  name: z.string().min(1).max(255),
  username: z.string().min(1).max(255),
  password: z.string().min(8).max(255),
  email: z.string().email(),
}).pick({
  name: true,
  username: true,
  password: true,
  email: true,
});
