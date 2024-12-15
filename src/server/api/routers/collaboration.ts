// src/server/api/routers/collaboration.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { EventEmitter } from "events";

const ee = new EventEmitter();

export const collaborationRouter = createTRPCRouter({
  onUpdate: publicProcedure.subscription(async function* () {
    const events: { update: Uint8Array }[] = [];

    function onUpdate(update: Uint8Array) {
      events.push({ update });
    }

    ee.on("update", onUpdate);

    try {
      while (true) {
        if (events.length > 0) {
          yield events.shift()!;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } finally {
      ee.off("update", onUpdate);
    }
  }),

  broadcastUpdate: publicProcedure
    .input(z.instanceof(Uint8Array))
    .mutation(async ({ input }) => {
      ee.emit("update", input);
      return true;
    }),
});
