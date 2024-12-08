"use client";

import FriendCard from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import React, { Suspense } from "react";

export default function FriendPage() {
  const utils = api.useUtils();
  const [users] = api.users.fetchAllUsers.useSuspenseQuery();

  const sendRequestMutation = api.users.sendFriendRequest.useMutation({
    onSuccess: () => {
      globalSuccessToast("Friend request sent!");

      utils.users.fetchAllUsers.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
  });

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Add Friends</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        <Suspense fallback={<div>Loading...</div>}>
          {users.length > 0 ? (
            users.map((user) => (
              <FriendCard
                key={user.id}
                user={user}
                action={
                  <div className="ml-auto">
                    <Button
                      onClick={() => {
                        sendRequestMutation.mutate({
                          friendId: user.id,
                        });
                      }}
                      disabled={sendRequestMutation.isPending}
                    >
                      Send Friend Request
                    </Button>
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
