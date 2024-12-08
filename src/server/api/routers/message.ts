import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked } from "@trpc/server";
import { ee } from "@/lib/event-emitter";
import { z } from "zod";
import { createMessageSchema } from "@/schema/message";
import {
  createMessage,
  getAllMessages,
  getAllMessagesByUserId,
  getMessageFullById,
} from "@/server/queries/messages.queries";
import type { Message } from "@/types/messages";

export const messageRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(createMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const message = await createMessage(ctx.session.userId, input);

      const fullMessage = await getMessageFullById(
        ctx.session.userId,
        message.id,
      );

      if (!fullMessage) {
        throw new Error("Message not found");
      }

      ee.emit("sendMessage", ctx.session.userId, fullMessage);

      return message;
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
      }),
    )
    .query(async ({ ctx, input: { friendId } }) => {
      const messages = await getAllMessages(ctx.session.userId, friendId);

      return messages;
    }),

  subscribeToAllMessages: protectedProcedure.subscription(async function* ({
    ctx,
    signal,
  }) {
    const iterable = ee.toIterable("sendMessage", {
      signal: signal,
    });

    // First, yield any messages that were sent before the subscription
    const messages = await getAllMessagesByUserId(ctx.session.userId);

    function* maybeYield(message: Message) {
      yield tracked(message.id, message);
    }

    for (const message of messages) {
      yield* maybeYield(message);
    }

    for await (const [, message] of iterable) {
      yield* maybeYield(message);
    }
  }),

  subscribeToMessages: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
        lastEventId: z.string().nullish(),
      }),
    )
    .subscription(async function* ({ input, ctx, signal }) {
      const iterable = ee.toIterable("sendMessage", {
        signal: signal,
      });

      // First, yield any messages that were sent before the subscription
      const messages = await getAllMessages(ctx.session.userId, input.friendId);

      function* maybeYield(message: Message) {
        if (message.friendId !== input.friendId) {
          return;
        }

        if (input.lastEventId && message.id <= input.lastEventId) {
          return;
        }

        yield tracked(message.id, message);
      }

      for (const message of messages) {
        yield* maybeYield(message);
      }

      for await (const [, message] of iterable) {
        yield* maybeYield(message);
      }
    }),
});
