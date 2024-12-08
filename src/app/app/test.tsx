"use client";

import { api } from "@/trpc/react";
import type { Users } from "@/types/users";

interface TestListenProps {
  user: Users;
}

export default function TestListen({ user }: TestListenProps) {
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
