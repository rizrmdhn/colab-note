import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import type { FriendCardProps } from "@/types/custom-card";

export default function FriendCard({
  user,
  className,
  action,
  interactive,
  onClick,
}: FriendCardProps) {
  if (interactive) {
    return (
      <div
        className={cn(
          "cursor-pointer space-y-4",
          className,
          "rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800",
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar ?? ""} alt={user.name} />
            <AvatarFallback>
              {user.name
                .split(" ")
                .map((name) => name[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user.username}
            </p>
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatar ?? ""} alt={user.name} />
          <AvatarFallback>
            {user.name
              .split(" ")
              .map((name) => name[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="ml-4">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user.username}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
