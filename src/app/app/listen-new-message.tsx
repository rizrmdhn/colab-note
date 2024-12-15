"use client";

import { api } from "@/trpc/react";
import type { Users } from "@/types/users";

interface ListenNewMessageProps {
  user: Users;
}

export default function ListenNewMessage({}: ListenNewMessageProps) {
  const utils = api.useUtils();

  api.message.subscribeToAllMessages.useSubscription(undefined, {
    onData: () => {
      utils.users.friendMessageList.invalidate();
      utils.users.friendMessageList.refetch();
      utils.message.getMessages.invalidate();
    },
  });

  return null;
}
