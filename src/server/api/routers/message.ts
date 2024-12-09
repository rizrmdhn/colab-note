import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked } from "@trpc/server";
import { ee } from "@/lib/event-emitter";
import { z } from "zod";
import { createMessageSchema, updateMessageSchema } from "@/schema/message";
import {
  createMessage,
  getAllMessages,
  getAllMessagesByUserId,
  getMessageByIdOnly,
  getMessageFullById,
  updateMessage,
  updateMessageReadStatus,
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
      const messages = await getAllMessages(ctx.session.userId, friendId, null);

      // update the unread status of the messages
      for (const message of messages) {
        if (message.userId === friendId) {
          await updateMessageReadStatus(ctx.session.userId, message.id);
        }
      }

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
      if (ctx.session.userId === message.userId) {
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

      // Fetch the last message createdAt based on the last event id
      const lastMessageCreatedAt = await (async () => {
        const lastEventId = input.lastEventId;
        if (!lastEventId) return null;

        const message = await getMessageByIdOnly(lastEventId);

        return message?.createdAt ?? null;
      })();

      // First, yield any messages that were sent before the subscription
      const messages = await getAllMessages(
        ctx.session.userId,
        input.friendId,
        lastMessageCreatedAt,
      );

      function* maybeYield(message: Message) {
        if (ctx.session.userId === message.userId) {
          return;
        }

        if (lastMessageCreatedAt && message.createdAt <= lastMessageCreatedAt) {
          // ignore posts that we've already sent - happens if there is a race condition between the query and the event emitter
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

  updateMessage: protectedProcedure
    .input(updateMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const message = await updateMessage(ctx.session.userId, input.id, input);

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
});
