"use client";

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
      onData: () => {
        utils.users.fetchAllUsers.invalidate();
      },
    },
  );

  return null;
}
