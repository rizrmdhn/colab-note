"use client";

import MessageCard from "@/components/message-card";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

export default function NotePage() {
  const utils = api.useUtils();

  const [users] = api.users.friendMessageList.useSuspenseQuery();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleFriendClick = useCallback(
    (userId: string, friendId: string) => {
      const targetUserId = userId === users.userId ? friendId : userId;
      const currentUserId = searchParams.get("userId");

      router.push(
        currentUserId === targetUserId
          ? "/app/chats"
          : `/app/chats?userId=${targetUserId}`,
      );

      utils.message.getMessages.refetch({ friendId });
      utils.users.friendMessageList.invalidate();
    },
    [
      router,
      searchParams,
      users.userId,
      utils.message.getMessages,
      utils.users.friendMessageList,
    ],
  );

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {users.list.length > 0 ? (
        users.list.map((user) => (
          <MessageCard
            key={user.id}
            user={
              user.friendId === users.userId
                ? user.users
                : user.userId === users.userId
                  ? user.friends
                  : user.users
            }
            isActive={user.friendId === searchParams.get("userId")}
            message={user.latestMessage?.message ?? ""}
            count={user.unreadCount}
            onClick={() => handleFriendClick(user.userId, user.friendId)}
          />
        ))
      ) : (
        <div className="flex h-64 items-center justify-center">
          <p className="text-lg text-gray-500 dark:text-gray-400">
            No friends found.
          </p>
        </div>
      )}
    </Suspense>
  );
}
