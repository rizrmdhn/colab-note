import { api } from "@/trpc/react";
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { globalInfoToast } from "@/lib/utils";
import { skipToken } from "@tanstack/react-query";

interface MessageListProps {
  userId: string;
  friendId: string;
  onUpdate: (messageId: string, message: string) => void;
}

export default function MessageList({
  userId,
  friendId,
  onUpdate,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const [lastEventId, setLastEventId] = useState<
    // Query has not been run yet
    | false
    // Empty list
    | null
    // Event id
    | string
  >(false);

  const [messages] = api.message.getMessages.useSuspenseQuery({
    friendId,
  });

  if (messages && lastEventId === false) {
    // We should only set the lastEventId once, if the SSE-connection is lost, it will automatically reconnect and continue from the last event id
    // Changing this value will trigger a new subscription
    setLastEventId(messages.at(-1)?.id ?? null);
  }

  const utils = api.useUtils();

  // Enable subscription only when we have a valid userId
  api.message.subscribeToMessages.useSubscription(
    lastEventId === false ? skipToken : { friendId: userId ?? "", lastEventId },
    {
      onData: () => {
        globalInfoToast("New message received");
        utils.message.getMessages.invalidate();
        utils.users.friendMessageList.invalidate();
      },
      onError: (error) => {
        globalInfoToast(error.message);
        const lastMessageEventId = messages?.at(-1)?.id;

        if (lastMessageEventId) {
          setLastEventId(lastMessageEventId);
        }
      },
    },
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={listRef} className="h-[calc(100vh-330px)] overflow-y-auto p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col ${
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
            </span>
          </div>
          <div className="max-w-[80%] rounded-lg bg-gray-100 p-2">
            <p className="break-words text-sm text-black">{message.message}</p>
          </div>
          {message.userId === userId && (
            <div className="mt-1 flex gap-4 text-xs text-gray-600">
              <button
                className="hover:underline"
                onClick={() => onUpdate(message.id, message.message)}
              >
                Update
              </button>
            </div>
          )}
        </div>
      ))}
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-500">
          No messages yet
        </div>
      )}
    </div>
  );
}
