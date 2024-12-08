"use client";

import { globalInfoToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import { skipToken } from "@tanstack/react-query";
import type { Users } from "@/types/users";
import { friendRequestStore } from "@/store/friend-request.store";

interface ListenNewFriendRequestProps {
  user: Users;
}

export default function ListenNewFriendRequest({
  user,
}: ListenNewFriendRequestProps) {
  const lastEventId = friendRequestStore((state) => state.lastEventId);

  const utils = api.useUtils();

  api.users.friendRequestNotification.useSubscription(
    lastEventId === false ? skipToken : { userId: user.id, lastEventId },
    {
      onData: (data) => {
        globalInfoToast(
          `You have a new friend request from ${data.data.users.name}`,
        );

        utils.users.requestList.invalidate();
      },
    },
  );

  return null;
}
