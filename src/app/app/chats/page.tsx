"use client";

import FriendCard from "@/components/friend-card";
import { api } from "@/trpc/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NotePage() {
  const [users] = api.users.friendList.useSuspenseQuery();

  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {users.list.length > 0 ? (
        users.list.map((user) => (
          <FriendCard
            key={user.id}
            user={user.userId === users.userId ? user.friends : user.users}
            interactive
            onClick={() => {
              const userId =
                user.userId === users.userId ? user.friendId : user.userId;

              // get the search params from current URL if same user is clicked remove the query params
              const currentUserId = searchParams.get("userId");
              if (currentUserId === userId) {
                router.push(`/app/chats`);
                return;
              }

              router.push(`/app/chats?userId=${userId}`);
            }}
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
