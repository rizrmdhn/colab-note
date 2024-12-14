"use client";

import FriendCard from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { UserListSkeleton } from "@/components/user-list-skeleton";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { useFriendRequestStore } from "@/store/friend-request.store";
import { api } from "@/trpc/react";
import { LoaderCircle } from "lucide-react";
import React, { Suspense } from "react";

export default function FriendPage() {
  const utils = api.useUtils();
  const [isAccepting, setIsAccepting] = React.useState(new Set<string>());
  const [isRejecting, setIsRejecting] = React.useState(new Set<string>());
  const [isCanceling, setIsCanceling] = React.useState(new Set<string>());
  const [requestList, status] = api.users.requestList.useSuspenseQuery();
  const [me] = api.users.fetchMyDetails.useSuspenseQuery();

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
    onSuccess: () => {
      globalSuccessToast("Friend request accepted.");

      utils.users.friendList.invalidate();
      utils.users.requestList.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: (_, __, { requestId }) => {
      setIsRejecting((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    },
  });

  const cancelRequestMutation = api.users.cancelRequest.useMutation({
    onMutate: ({ requestId }) => {
      setIsCanceling((prev) => new Set(prev).add(requestId));
    },
    onSuccess: () => {
      globalSuccessToast("Friend request canceled.");

      utils.users.requestList.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: (_, __, { requestId }) => {
      setIsRejecting((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    },
  });

  const rejectRequestMutation = api.users.rejectRequest.useMutation({
    onMutate: ({ requestId }) => {
      setIsRejecting((prev) => new Set(prev).add(requestId));
    },
    onSuccess: () => {
      globalSuccessToast("Friend request rejected.");

      utils.users.requestList.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: (_, __, { requestId }) => {
      setIsRejecting((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    },
  });

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Friends Request</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        <Suspense fallback={<UserListSkeleton />}>
          {status.isFetching ? (
            <UserListSkeleton />
          ) : requestList.length > 0 ? (
            requestList.map((data) => (
              <FriendCard
                key={data.id}
                user={data.userId === me?.id ? data.friends : data.users}
                action={
                  data.userId === me?.id ? (
                    <div className="ml-auto flex flex-row gap-2">
                      <Button
                        onClick={() => {
                          cancelRequestMutation.mutate({
                            requestId: data.id,
                          });
                        }}
                        disabled={isCanceling.has(data.id)}
                        className="bg-red-500 text-white hover:bg-red-600 hover:text-white"
                      >
                        {isCanceling.has(data.id) && (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  ) : (
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
                        {isRejecting.has(data.id) && (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        )}
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
                        {isAccepting.has(data.id) && (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Accept
                      </Button>
                    </div>
                  )
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
