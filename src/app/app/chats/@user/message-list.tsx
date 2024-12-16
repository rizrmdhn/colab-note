import { api } from "@/trpc/react";
import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { globalInfoToast } from "@/lib/utils";
import { skipToken } from "@tanstack/react-query";
import { TypingIndicator } from "@/components/typing-indicator";

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
  const [lastEventId, setLastEventId] = useState<false | null | string>(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);

  const [messages] = api.message.getMessages.useSuspenseQuery({
    friendId,
  });

  if (messages && lastEventId === false) {
    setLastEventId(messages.at(-1)?.id ?? null);
  }

  const utils = api.useUtils();

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

  api.message.listenToIsTyping.useSubscription(
    friendId ? { friendId } : skipToken,
    {
      onData: (data) => {
        setIsTyping(data.data.isTyping);
        setTypingUserId(data.id);
      },
      onError: (error) => {
        globalInfoToast(error.message);
      },
    },
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={listRef}
      className="h-[calc(100vh-330px)] space-y-4 overflow-y-auto p-4"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col ${
            message.userId === userId ? "items-end" : "items-start"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {message.friendId === userId
                ? message.users.username
                : message.userId === userId
                  ? "You"
                  : message.users.username}
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
      {isTyping && <TypingIndicator isOwnMessage={typingUserId === friendId} />}
      {messages.length === 0 && !isTyping && (
        <div className="flex h-full items-center justify-center text-gray-500">
          No messages yet
        </div>
      )}
    </div>
  );
}
