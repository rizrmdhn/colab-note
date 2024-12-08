import { api } from "@/trpc/react";
import React, { useState } from "react";
import MessageList from "./message-list";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

export default function MessageForm({
  userId,
  friendId,
}: {
  userId: string;
  friendId: string;
}) {
  const [messageId, setMessageId] = useState("");
  const [message, setMessage] = useState("");

  const utils = api.useUtils();

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => {
      globalSuccessToast("Message sent successfully");

      setMessage("");
      utils.message.getMessages.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
  });

  const updateMessageMutation = api.message.updateMessage.useMutation({
    onSuccess: () => {
      globalSuccessToast("Message updated successfully");

      setMessage("");
      setMessageId("");
      utils.message.getMessages.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
  });

  return (
    <div className="flex h-96 flex-1 flex-col">
      <MessageList
        userId={userId}
        friendId={friendId}
        onUpdate={(messageId, message) => {
          setMessageId(messageId);
          setMessage(message);
        }}
      />
      {messageId ? (
        <div className="p-4">
          <form>
            <div className="grid gap-4">
              <textarea
                className="p-4"
                placeholder="Sent a note..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex flex-row-reverse gap-4">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    // Update
                    updateMessageMutation.mutate({
                      friendId,
                      id: messageId,
                      message,
                    });
                  }}
                >
                  {/* {isPending ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : null} */}
                  Update
                </Button>

                {message.trim() !== "" && messageId && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setMessage("");
                      setMessageId("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4">
          <form>
            <div className="grid gap-4">
              <textarea
                className="p-4"
                placeholder="Sent a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex flex-row-reverse gap-4">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    // Create
                    sendMessageMutation.mutate({
                      friendId,
                      message,
                    });
                  }}
                >
                  {sendMessageMutation.isPending ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Send
                </Button>

                {message.trim() !== "" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setMessage("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
