import { createUserSchema } from "@/schema/users";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { getUserByUsername, insertUser } from "@/server/queries/users.queries";
import { z } from "zod";
import { verify } from "@node-rs/argon2";
import { TRPCError } from "@trpc/server";
import {
  createSession,
  invalidateSession,
} from "@/server/queries/sessions.queries";
import { deleteSessionTokenCookie, setSessionTokenCookie } from "@/lib/session";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input: { username, password } }) => {
      const user = await getUserByUsername(username);

      if (!user) {
        throw new Error("User not found");
      }

      // verify password
      const verifyPasswordResult = await verify(user.password, password);

      if (!verifyPasswordResult) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid User Credentials",
        });
      }

      // create session
      const session = await createSession(user.id);

      setSessionTokenCookie(session.id, new Date(session.expiresAt));

      return session;
    }),

  register: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      await insertUser(input);
    }),

  logout: protectedProcedure.mutation(async ({ ctx: { session } }) => {
    await invalidateSession(session.id);

    deleteSessionTokenCookie();

    return true;
  }),
});
