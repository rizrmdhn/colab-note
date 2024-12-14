"use client";

import FriendCard from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import React, { Suspense } from "react";
import SearchForm from "./search-form";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

export default function FriendPage() {
  const utils = api.useUtils();

  const [isAddingFriend, setIsAddingFriend] = React.useState(new Set<string>());
  const [users] = api.users.fetchAllUsers.useSuspenseQuery();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 500);

  const sendRequestMutation = api.users.sendFriendRequest.useMutation({
    onMutate: ({ friendId }) => {
      setIsAddingFriend((prev) => new Set(prev).add(friendId));
    },
    onSuccess: ({ friendId }) => {
      globalSuccessToast("Friend request sent!");
      // remove the user from the set of users we're adding
      setIsAddingFriend((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });

      utils.users.fetchAllUsers.invalidate();
    },
    onError: (error, { friendId }) => {
      globalErrorToast(error.message);

      // remove the user from the set of users we're adding
      setIsAddingFriend((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    },
  });

  const { data: searchResults, isFetching: isSearchPending } =
    api.users.searchUsers.useQuery(
      {
        query: debouncedQuery,
      },
      {
        enabled: !!debouncedQuery && debouncedQuery.trim().length > 0,
      },
    );

  // Only show loading state when we're actually searching
  const isLoading = !!debouncedQuery && isSearchPending;
  const displayedUsers = debouncedQuery ? searchResults : users;

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Add Friends</h1>
      </div>

      <div className="space-y-6">
        <SearchForm setQuery={setQuery} isPending={isSearchPending} />

        <Suspense fallback={<UserListSkeleton />}>
          <div className="space-y-4">
            {isLoading ? (
              <UserListSkeleton />
            ) : displayedUsers?.length ? (
              displayedUsers.map((user) => (
                <FriendCard
                  key={user.id}
                  user={user}
                  action={
                    <Button
                      onClick={() => {
                        sendRequestMutation.mutate({
                          friendId: user.id,
                        });
                      }}
                      disabled={isAddingFriend.has(user.id)}
                      className="ml-auto"
                    >
                      {isAddingFriend.has(user.id)
                        ? "Sending..."
                        : "Send Friend Request"}
                    </Button>
                  }
                />
              ))
            ) : (
              <EmptyState
                message={
                  debouncedQuery
                    ? `No users found matching "${debouncedQuery}"`
                    : "No users available to add as friends."
                }
              />
            )}
          </div>
        </Suspense>
      </div>
    </section>
  );
}

const UserListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((index) => (
      <div
        key={index}
        className="flex items-center space-x-4 rounded-lg border p-4"
      >
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-64 items-center justify-center">
    <p className="text-lg text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);
