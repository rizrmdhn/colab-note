"use client";

import { globalInfoToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { Users } from "@/types/users";

interface ListenNewFriendRequestProps {
  user: Users;
}

export default function ListenNewFriendRequest({
  user,
}: ListenNewFriendRequestProps) {
  const utils = api.useUtils();

  api.users.friendRequestNotification.useSubscription(
    {
      userId: user.id,
    },
    {
      onData: (data) => {
        globalInfoToast(
          `You have a new friend request from ${data.data.users.name}`,
        );
        utils.users.fetchAllUsers.invalidate();
      },
    },
  );

  return null;
}
