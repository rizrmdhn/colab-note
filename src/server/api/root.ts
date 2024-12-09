import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";
import { messageRouter } from "./routers/message";
import { noteRouter } from "./routers/notes";
import { noteCollaboratorsRouter } from "./routers/note-collaborators";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: usersRouter,
  message: messageRouter,
  notes: noteRouter,
  noteCollaborator: noteCollaboratorsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
