import { api } from "@/trpc/react";
import React, { useEffect, useRef } from "react";
import { format } from "date-fns";

interface MessageListProps {
  userId: string;
  friendId: string;
}

export default function MessageList({ userId, friendId }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const [messages] = api.message.getMessages.useSuspenseQuery({
    friendId,
  });

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-2 flex flex-col ${
            message.userId === userId ? "items-end" : "items-start"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {message.userId === userId ? "You" : message.friends.name}
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), "yyyy-MM-dd HH:mm")}
              {message.updatedAt && message.updatedAt !== message.createdAt && (
                <span className="text-xs italic text-gray-400"> (edited)</span>
              )}
              {/* {message.isRead && (
                <span className="text-xs italic text-gray-400"> (read)</span>
              )} */}
            </span>
          </div>
          <div className="rounded-lg bg-gray-100 p-2">
            <p className="text-sm text-black">{message.message}</p>
          </div>
          {/* {message.userId === userId && !catatan.isRead && (
            <div className="flex gap-4 text-xs text-gray-600">
              <button
                className="hover:underline"
                onClick={() => {
                  mutate({
                    catatanHarianUsulanId: catatan.catatanHarianUsulanId,
                  });
                }}
                disabled={status === "pending"}
              >
                Mark as read
              </button>
            </div>
          )}
          {catatan.userId === userId && catatan.isRead && (
            <div className="flex gap-4 text-xs text-gray-600">
              <button
                className="hover:underline"
                onClick={() => {
                  markAsUnread({
                    catatanHarianUsulanId: catatan.catatanHarianUsulanId,
                  });
                }}
                disabled={isPending}
              >
                Mark as unread
              </button>
            </div>
          )} */}
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex flex-1 flex-col text-center text-gray-500">
          No messages yet
        </div>
      )}
    </div>
  );
}
