import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import type { Users } from "@/types/users";
import { Badge } from "./ui/badge";

interface MessageCardProps {
  user: Users;
  lastSentUser: string;
  message: string;
  count: number;
  isActive?: boolean;
  className?: string;
  onClick: () => void;
}

export default function MessageCard({
  user,
  lastSentUser,
  message,
  count,
  isActive = false,
  className,
  onClick,
}: MessageCardProps) {
  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase();

  return (
    <button
      type="button"
      className={cn(
        "w-full cursor-pointer space-y-4 rounded-lg p-2 text-left transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isActive && "bg-gray-100 dark:bg-gray-800",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatar ?? ""} alt={`${user.name}'s avatar`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-row items-center justify-between">
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
              {lastSentUser}: {message}
            </p>
          </div>
          {count > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center"
            >
              <span className="text-xs font-semibold">{count}</span>
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
