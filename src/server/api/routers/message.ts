import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked } from "@trpc/server";
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
import MessageQueue from "@/server/redis/queue";
import RedisSubscriptionManager from "@/server/redis/subscription-manager";
import type Redis from "ioredis";

interface TypingState {
  timeout: NodeJS.Timeout;
  lastUpdate: number;
  isTyping: boolean;
}

interface TypingEvent {
  userId: string;
  friendId: string;
  isTyping: boolean;
}

const typingStates = new Map<string, TypingState>();

function getTypingKey(userId: string, friendId: string) {
  return `${userId}:${friendId}`;
}

function updateTypingState(
  pub: Redis,
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
      const typingData: TypingEvent = {
        userId,
        friendId,
        isTyping: false,
      };

      // ee.emit("typingStateChange", userId, friendId, false);
      pub.publish("typingStateChange", JSON.stringify(typingData));
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
      const typingData: TypingEvent = {
        userId,
        friendId,
        isTyping: false,
      };
      // ee.emit("typingStateChange", userId, friendId, false);
      pub.publish("typingStateChange", JSON.stringify(typingData));
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
    const typingData: TypingEvent = {
      userId,
      friendId,
      isTyping: false,
    };
    // ee.emit("typingStateChange", userId, friendId, false);
    pub.publish("typingStateChange", JSON.stringify(typingData));
  }, TYPING_TIMEOUT);

  typingStates.set(key, {
    timeout,
    lastUpdate: now,
    isTyping: true,
  });

  // Only emit if state changed or enough time passed
  if (!currentState?.isTyping) {
    const typingData: TypingEvent = {
      userId,
      friendId,
      isTyping: true,
    };
    // ee.emit("typingStateChange", userId, friendId, true);
    pub.publish("typingStateChange", JSON.stringify(typingData));
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

      // ee.emit("sendMessage", ctx.session.userId, fullMessage);
      await ctx.pub.publish("sendMessage", JSON.stringify(fullMessage));

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
    // Set up message queue and processing
    const messageQueue = new MessageQueue<Message>();
    const subscriptionManager = RedisSubscriptionManager.getInstance<Message>(
      ctx.sub,
      "sendMessage",
      ctx.session.id,
    );

    try {
      const lastMessageCreatedAt = await (async (): Promise<string | null> => {
        const message = await getLatestMessage(ctx.session.userId);
        return message?.createdAt ?? null;
      })();

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

      // First yield existing messages
      const messages = await getAllMessagesByUserId(ctx.session.userId);
      for (const message of messages) {
        yield* maybeYield(message);
      }

      // Subscribe and handle messages
      subscriptionManager.onMessage((parsedMessage: Message) => {
        messageQueue.enqueue(parsedMessage);
      });

      await subscriptionManager.subscribe();

      signal?.addEventListener("abort", () => {
        void subscriptionManager.cleanup();
      });

      // Process messages
      while (!signal?.aborted) {
        const message = await messageQueue.dequeue();
        yield* maybeYield(message);
      }
    } catch (error) {
      console.error("Subscription error in subscribeToAllMessages:", error);
      throw error;
    } finally {
      void subscriptionManager.cleanup();
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
      const messageQueue = new MessageQueue<Message>();
      const subscriptionManager = RedisSubscriptionManager.getInstance<Message>(
        ctx.sub,
        "sendMessage",
        ctx.session.id,
      );

      try {
        const lastMessageCreatedAt = await (async (): Promise<
          string | null
        > => {
          const lastEventId = input.lastEventId;
          if (!lastEventId) return null;
          const message = await getMessageByIdOnly(lastEventId);
          return message?.createdAt ?? null;
        })();

        function* maybeYield(message: Message) {
          if (ctx.session.userId === message.userId) {
            return;
          }
          if (
            lastMessageCreatedAt &&
            message.createdAt <= lastMessageCreatedAt
          ) {
            return;
          }
          yield tracked(message.id, message);
        }

        // Initial messages
        const messages = await getAllMessages(
          ctx.session.userId,
          input.friendId,
          lastMessageCreatedAt,
        );

        for (const message of messages) {
          yield* maybeYield(message);
        }

        // Subscribe and handle messages
        subscriptionManager.onMessage((parsedMessage: Message) => {
          messageQueue.enqueue(parsedMessage);
        });

        await subscriptionManager.subscribe();

        signal?.addEventListener("abort", () => {
          void subscriptionManager.cleanup();
        });

        // Process messages
        while (!signal?.aborted) {
          const message = await messageQueue.dequeue();
          yield* maybeYield(message);
        }
      } catch (error) {
        console.error("Subscription error:", error);
        throw error;
      } finally {
        try {
          await subscriptionManager.cleanup();
        } catch (error) {
          console.error("Error during final cleanup:", error);
        }
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

      updateTypingState(
        ctx.pub,
        ctx.session.userId,
        input.friendId,
        input.isTyping,
      );
      return true;
    }),

  listenToIsTyping: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .subscription(async function* ({ input, ctx, signal }) {
      const typingQueue = new MessageQueue<TypingEvent>();
      const subscriptionManager =
        RedisSubscriptionManager.getInstance<TypingEvent>(
          ctx.sub,
          "typingStateChange",
          ctx.session.id,
        );

      try {
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

        // Subscribe and handle messages
        subscriptionManager.onMessage((parsedMessage: TypingEvent) => {
          typingQueue.enqueue(parsedMessage);
        });

        await subscriptionManager.subscribe();

        signal?.addEventListener("abort", () => {
          void subscriptionManager.cleanup();
        });

        // Process messages
        while (!signal?.aborted) {
          const message = await typingQueue.dequeue();
          yield* maybeYield(message.userId, message.friendId, message.isTyping);
        }
      } catch (error) {
        console.error("Subscription error:", error);
        throw error;
      } finally {
        try {
          await subscriptionManager.cleanup();
        } catch (error) {
          console.error("Error during final cleanup:", error);
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

      // ee.emit("sendMessage", ctx.session.userId, fullMessage);
      await ctx.pub.publish("sendMessage", JSON.stringify(fullMessage));

      return message;
    }),
});
