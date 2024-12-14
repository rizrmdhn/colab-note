"use client";

import FriendCard from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { useFriendRequestStore } from "@/store/friend-request.store";
import { api } from "@/trpc/react";
import React, { Suspense } from "react";

export default function FriendPage() {
  const utils = api.useUtils();
  const [isAccepting, setIsAccepting] = React.useState(new Set<string>());
  const [isRejecting, setIsRejecting] = React.useState(new Set<string>());
  const [requestList] = api.users.requestList.useSuspenseQuery();

  const lastEventId = useFriendRequestStore((state) => state.lastEventId);
  const setFriendRequestLastEventId = useFriendRequestStore(
    (state) => state.setLastEventId,
  );

  if (requestList && lastEventId === false) {
    setFriendRequestLastEventId(requestList.at(-1)?.id ?? null);
  }

  const acceptRequestMutation = api.users.acceptRequest.useMutation({
    onMutate: ({ requestId }) => {
      setIsAccepting((prev) => new Set(prev).add(requestId));
    },
    onSuccess: ({ id }) => {
      globalSuccessToast("Friend request accepted.");

      setIsAccepting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      utils.users.friendList.invalidate();
      utils.users.requestList.invalidate();
    },
    onError: (error, { requestId }) => {
      setIsAccepting((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });

      globalErrorToast(error.message);
    },
  });

  const rejectRequestMutation = api.users.rejectRequest.useMutation({
    onMutate: ({ requestId }) => {
      setIsRejecting((prev) => new Set(prev).add(requestId));
    },
    onSuccess: ({ id }) => {
      globalSuccessToast("Friend request rejected.");

      setIsRejecting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      utils.users.requestList.invalidate();
    },
    onError: (error, { requestId }) => {
      setIsRejecting((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });

      globalErrorToast(error.message);
    },
  });

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Friends Request</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        <Suspense fallback={<div>Loading...</div>}>
          {requestList.length > 0 ? (
            requestList.map((data) => (
              <FriendCard
                key={data.id}
                user={data.users}
                action={
                  <div className="ml-auto flex flex-row gap-2">
                    <Button
                      onClick={() => {
                        rejectRequestMutation.mutate({
                          requestId: data.id,
                        });
                      }}
                      disabled={isRejecting.has(data.id)}
                      className="bg-red-500 text-white hover:bg-red-600 hover:text-white"
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        acceptRequestMutation.mutate({
                          requestId: data.id,
                        });
                      }}
                      disabled={isAccepting.has(data.id)}
                    >
                      Accept
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
