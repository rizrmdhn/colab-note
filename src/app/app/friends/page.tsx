"use client";

import FriendCard from "@/components/friend-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import Link from "next/link";
import React, { Suspense } from "react";

export default function FriendPage() {
  const utils = api.useUtils();
  const [users] = api.users.friendList.useSuspenseQuery();

  const sendRequestMutation = api.users.removeFriend.useMutation({
    onSuccess: () => {
      globalSuccessToast("Friend removed.");

      utils.users.friendList.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
  });

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Friends</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        <Suspense fallback={<div>Loading...</div>}>
          {users.list.length > 0 ? (
            users.list.map((user) => (
              <FriendCard
                key={user.id}
                user={user.userId === users.userId ? user.friends : user.users}
                action={
                  <div className="ml-auto flex flex-row gap-2">
                    <Button
                      onClick={() => {
                        sendRequestMutation.mutate({
                          friendId: user.id,
                        });
                      }}
                      disabled={sendRequestMutation.isPending}
                    >
                      Remove Friend
                    </Button>
                    <Link
                      href={
                        user.userId === users.userId
                          ? `/app/chats?userId=${user.friendId}`
                          : `/app/chats?userId=${user.userId}`
                      }
                      className={cn(buttonVariants({ variant: "default" }))}
                    >
                      Send Message
                    </Link>
                  </div>
                }
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
      </div>
    </section>
  );
}
