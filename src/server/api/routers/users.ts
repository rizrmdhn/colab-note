import { getAllUsers } from "@/server/queries/users.queries";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked, TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  acceptFriendRequestById,
  getFriendRequestsByUserId,
  getRequestListByUserId,
  insertFriendRequest,
} from "@/server/queries/friend-requests.queries";
import type { FriendRequest } from "@/types/friend-request";
import { ee } from "@/lib/event-emitter";
import {
  deleteFriend,
  getFriendsByUserId,
} from "@/server/queries/friends.queries";

export const usersRouter = createTRPCRouter({
  fetchAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const users = await getAllUsers(ctx.session.userId);

    return users;
  }),

  friendList: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriendsByUserId(ctx.session.userId);

    const data = {
      list: friends,
      userId: ctx.session.userId,
    };

    return data;
  }),

  sendFriendRequest: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.friendId === ctx.session.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot send a friend request to yourself",
        });
      }

      const friendRequest = await insertFriendRequest(
        ctx.session.userId,
        input.friendId,
      );

      ee.emit("addFriend", ctx.session.userId, friendRequest);

      return friendRequest;
    }),

  friendRequestNotification: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        lastEventId: z.string().nullish(),
      }),
    )
    .subscription(async function* ({ input, signal }) {
      const iterable = ee.toIterable("addFriend", {
        signal,
      });

      // First, yield any pending friend requests from the database
      const pendingRequests = await getFriendRequestsByUserId(input.userId);

      function* maybeYield(friendRequest: FriendRequest) {
        if (friendRequest.friendId === input.userId) {
          yield tracked(friendRequest.id, friendRequest);
        }
      }

      // yield the posts we fetched from the db
      for (const friendRequest of pendingRequests) {
        yield* maybeYield(friendRequest);
      }

      // yield any new posts from the event emitter
      for await (const [, friendId] of iterable) {
        yield* maybeYield(friendId);
      }
    }),

  requestList: protectedProcedure.query(async ({ ctx }) => {
    const friendRequests = await getRequestListByUserId(ctx.session.userId);

    return friendRequests;
  }),

  acceptRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const friendRequest = await acceptFriendRequestById(
        input.requestId,
        ctx.session.userId,
      );

      return friendRequest;
    }),

  removeFriend: protectedProcedure
    .input(
      z.object({
        friendId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const friend = await deleteFriend(ctx.session.userId, input.friendId);

      return friend;
    }),
});
