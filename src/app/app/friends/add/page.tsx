"use client";

import FriendCard from "@/components/friend-card";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import React, { Suspense } from "react";
import SearchForm from "./search-form";
import { useDebounce } from "@/hooks/use-debounce";
import { LoaderCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { UserListSkeleton } from "@/components/user-list-skeleton";

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
    onSuccess: () => {
      globalSuccessToast("Friend request sent!");

      utils.users.fetchAllUsers.invalidate();
      utils.users.searchUsers.invalidate();
      utils.users.requestList.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: (_, __, { friendId }) => {
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
                      {isAddingFriend.has(user.id) && (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
