import { api } from "@/trpc/react";
import React, { useEffect } from "react";
import MessageList from "./message-list";
import { Button } from "@/components/ui/button";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";
import { useThrottledIsTypingMutation } from "@/hooks/use-throttled-is-typing-mutation";
import { Textarea } from "@/components/ui/textarea";
import { useSentMessageRequestStore } from "@/store/sent-message.store";

export default function MessageForm({
  userId,
  friendId,
}: {
  userId: string;
  friendId: string;
}) {
  const id = useSentMessageRequestStore((state) => state.id);
  const setId = useSentMessageRequestStore((state) => state.setSentMessageId);
  const content = useSentMessageRequestStore((state) => state.content);
  const setContent = useSentMessageRequestStore((state) => state.setContent);
  const isFocused = useSentMessageRequestStore((state) => state.isFocused);
  const setIsFocused = useSentMessageRequestStore(
    (state) => state.setIsFocused,
  );

  const utils = api.useUtils();

  const handleSuccess = (successMessage: string) => {
    globalSuccessToast(successMessage);
    setId(null);
    setContent("");
    utils.message.getMessages.invalidate();
    utils.users.friendMessageList.invalidate();
  };

  const sendMessageMutation = api.message.sendMessage.useMutation({
    onSuccess: () => handleSuccess("Message sent successfully"),
    onError: (error) => globalErrorToast(error.message),
  });

  const updateMessageMutation = api.message.updateMessage.useMutation({
    onSuccess: () => handleSuccess("Message updated successfully"),
    onError: (error) => globalErrorToast(error.message),
  });

  const isTypingMutation = useThrottledIsTypingMutation(friendId);

  useEffect(() => {
    isTypingMutation(isFocused && content.trim().length > 0);
  }, [isFocused, content, isTypingMutation]);

  const handleMessageUpdate = (messageId: string, content: string) => {
    setId(messageId);
    setContent(content);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = content.trim();

    if (!trimmedMessage) return;

    if (id) {
      updateMessageMutation.mutate({
        friendId,
        id: id,
        message: trimmedMessage,
      });
    } else {
      sendMessageMutation.mutate({
        friendId,
        message: trimmedMessage,
      });
    }
  };

  const handleReset = () => {
    setId(null);
    setContent("");
  };

  const isSubmitDisabled =
    !content.trim() ||
    (id ? updateMessageMutation.isPending : sendMessageMutation.isPending);

  return (
    <div className="flex h-full flex-col">
      <MessageList
        userId={userId}
        friendId={friendId}
        onUpdate={handleMessageUpdate}
      />
      <div className="shrink-0 p-4">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <Textarea
              className="min-h-24 resize-none p-4"
              placeholder={id ? "Edit message..." : "Send a message..."}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                // Send isTyping mutation when user is typing and focused
                if (isFocused) {
                  isTypingMutation(e.target.value.trim().length > 0);
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            <div className="flex flex-row-reverse gap-4">
              <Button type="submit" size="sm" disabled={isSubmitDisabled}>
                {(id
                  ? updateMessageMutation.isPending
                  : sendMessageMutation.isPending) && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                {id ? "Update" : "Send"}
              </Button>

              {content.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
