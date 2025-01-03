import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked } from "@trpc/server";
import { ee } from "@/lib/event-emitter";
import { z } from "zod";
import { createMessageSchema, updateMessageSchema } from "@/schema/message";
import {
  createMessage,
  getAllMessages,
  getAllMessagesByUserId,
  getLatestMessage,
  getMessageByIdOnly,
  getMessageFullById,
  updateMessage,
  updateMessageReadStatus,
} from "@/server/queries/messages.queries";
import type { Message } from "@/types/messages";
import { THROTTLE_INTERVAL, TYPING_TIMEOUT } from "@/lib/constants";

interface TypingState {
  timeout: NodeJS.Timeout;
  lastUpdate: number;
  isTyping: boolean;
}

const typingStates = new Map<string, TypingState>();

function getTypingKey(userId: string, friendId: string) {
  return `${userId}:${friendId}`;
}

function updateTypingState(
  userId: string,
  friendId: string,
  isTyping: boolean,
) {
  const key = getTypingKey(userId, friendId);
  const now = Date.now();
  const currentState = typingStates.get(key);

  // Clear existing timeout if any
  if (currentState?.timeout) {
    clearTimeout(currentState.timeout);
  }

  // Handle stopping typing
  if (!isTyping) {
    if (currentState?.isTyping) {
      typingStates.delete(key);
      ee.emit("typingStateChange", userId, friendId, false);
    }
    return;
  }

  // Check if we should throttle the update
  if (
    currentState?.isTyping &&
    now - currentState.lastUpdate < THROTTLE_INTERVAL
  ) {
    // Update the timeout but don't emit new event
    const timeout = setTimeout(() => {
      typingStates.delete(key);
      ee.emit("typingStateChange", userId, friendId, false);
    }, TYPING_TIMEOUT);

    typingStates.set(key, {
      timeout,
      lastUpdate: currentState.lastUpdate, // Keep the last update time
      isTyping: true,
    });
    return;
  }

  // Set new typing state
  const timeout = setTimeout(() => {
    typingStates.delete(key);
    ee.emit("typingStateChange", userId, friendId, false);
  }, TYPING_TIMEOUT);

  typingStates.set(key, {
    timeout,
    lastUpdate: now,
    isTyping: true,
  });

  // Only emit if state changed or enough time passed
  if (!currentState?.isTyping) {
    ee.emit("typingStateChange", userId, friendId, true);
  }
}

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

    // Fetch the last message createdAt based on the last event id
    const lastMessageCreatedAt = await (async () => {
      const message = await getLatestMessage(ctx.session.userId);

      return message?.createdAt ?? null;
    })();

    // First, yield any messages that were sent before the subscription
    const messages = await getAllMessagesByUserId(ctx.session.userId);

    function* maybeYield(message: Message) {
      if (ctx.session.userId === message.userId) {
        return;
      }

      if (lastMessageCreatedAt && message.createdAt <= lastMessageCreatedAt) {
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

  isTyping: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
        isTyping: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const key = getTypingKey(ctx.session.userId, input.friendId);
      const existing = typingStates.get(key);
      const now = Date.now();

      // Throttle updates
      if (existing && now - existing.lastUpdate < THROTTLE_INTERVAL) {
        return true;
      }

      updateTypingState(ctx.session.userId, input.friendId, input.isTyping);
      return true;
    }),

  listenToIsTyping: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .subscription(async function* ({ input, ctx, signal }) {
      const iterable = ee.toIterable("typingStateChange", { signal });

      function* maybeYield(
        userId: string,
        friendId: string,
        isTyping: boolean,
      ) {
        // Only yield if the event is for our friend typing to us
        if (userId === input.friendId && friendId === ctx.session.userId) {
          yield tracked(friendId, {
            type: "isTyping" as const,
            isTyping,
          });
        }
      }

      // Check initial state
      const key = getTypingKey(input.friendId, ctx.session.userId);
      const initialState = typingStates.has(key);
      if (initialState) {
        yield tracked(input.friendId, {
          type: "isTyping" as const,
          isTyping: true,
        });
      }

      try {
        for await (const [userId, friendId, isTyping] of iterable) {
          yield* maybeYield(userId, friendId, isTyping);
        }
      } finally {
        // Cleanup on unsubscribe
        const key = getTypingKey(ctx.session.userId, input.friendId);
        if (typingStates.has(key)) {
          clearTimeout(typingStates.get(key)!.timeout);
          typingStates.delete(key);
        }
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
