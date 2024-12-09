"use client";

import { messageRequestStore } from "@/store/message.store";
import { api } from "@/trpc/react";
import type { Users } from "@/types/users";

interface ListenNewMessageProps {
  user: Users;
}

export default function ListenNewMessage({ user }: ListenNewMessageProps) {
  const utils = api.useUtils();

  const lastEventId = messageRequestStore((state) => state.lastEventId);

  api.message.subscribeToAllMessages.useSubscription(
    {
      lastEventId: lastEventId === false ? null : lastEventId,
    },
    {
      onData: (data) => {
        // check if the message is from the friend we are currently chatting with
        const userData =
          data.data.userId === user.id ? data.data.friends : data.data.users;
        utils.users.friendMessageList.invalidate();
        utils.message.getMessages.invalidate({ friendId: userData.id });
      },
    },
  );

  return null;
}
