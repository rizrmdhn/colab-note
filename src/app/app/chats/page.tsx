"use client";

import FriendCard from "@/components/friend-card";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

export default function NotePage() {
  const [users] = api.users.friendList.useSuspenseQuery();
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
    },
    [router, searchParams, users.userId],
  );

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {users.list.length > 0 ? (
        users.list.map((user) => (
          <FriendCard
            key={user.id}
            user={user.userId === users.userId ? user.friends : user.users}
            interactive
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
