import {
  getAllUsers,
  getUserById,
  searchUser,
  updateUser,
} from "@/server/queries/users.queries";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { tracked, TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  acceptFriendRequestById,
  cancelFriendRequestById,
  getFriendRequestById,
  getFriendRequestsByUserId,
  getRequestListByUserId,
  insertFriendRequest,
  rejectFriendRequestById,
} from "@/server/queries/friend-requests.queries";
import type { FriendRequest } from "@/types/friend-request";
import { ee } from "@/lib/event-emitter";
import {
  deleteFriend,
  getFriendsByUserId,
  getFriendsByUserIdOrderByMessageCreatedAt,
} from "@/server/queries/friends.queries";
import { updateUserSchema } from "@/schema/users";
import { deleteFile, uploadFile } from "@/server/storage";
import { base64ToFile } from "@/lib/base64-converter";

export const usersRouter = createTRPCRouter({
  fetchAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const users = await getAllUsers(ctx.session.userId);

    return users;
  }),

  fetchMyDetails: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  friendMessageList: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriendsByUserIdOrderByMessageCreatedAt(
      ctx.session.userId,
    );

    const data = {
      list: friends,
      userId: ctx.session.userId,
    };

    return data;
  }),

  friendList: protectedProcedure.query(async ({ ctx }) => {
    const friends = await getFriendsByUserId(ctx.session.userId);

    const data = {
      list: friends,
      userId: ctx.session.userId,
    };

    return data;
  }),

  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await searchUser(ctx.session.userId, input.query);

      return users;
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

      // Fetch the last message createdAt based on the last event id
      const lastMessageCreatedAt = await (async () => {
        const lastEventId = input.lastEventId;
        if (!lastEventId) return null;

        const message = await getFriendRequestById(lastEventId);

        return message?.createdAt ?? null;
      })();

      // First, yield any pending friend requests from the database
      const pendingRequests = await getFriendRequestsByUserId(
        input.userId,
        lastMessageCreatedAt,
      );

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

  cancelRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const friendRequest = await cancelFriendRequestById(
        input.requestId,
        ctx.session.userId,
      );

      return friendRequest;
    }),

  rejectRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const friendRequest = await rejectFriendRequestById(
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

  updateProfile: protectedProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const oldData = await getUserById(ctx.session.userId);

      let filename: string | undefined;

      if (!oldData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (oldData.avatar && input.avatar) {
        // delete old avatar
        await deleteFile(oldData.avatar);
      }

      if (input.avatar) {
        // convert base64 to file
        const file = await base64ToFile(input.avatar, {
          filename: `avatar-${ctx.session.userId}`,
        });

        filename = file.name;

        // upload file
        await uploadFile(file.name, file);
      }

      await updateUser(ctx.session.userId, input, filename);

      return true;
    }),
});
