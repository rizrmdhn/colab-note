import { compareNodes } from "@/lib/diff";
import { api } from "@/trpc/react";
import { type TEditor, type Value } from "@udecode/plate-common";
import { isEqual } from "lodash";
import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for handling real-time editor synchronization
 */
export function useRealtimeSync<V extends Value>({
  editor,
  noteId,
  setNotesContent,
}: {
  editor: TEditor<V>;
  noteId: string;
  setNotesContent: (content: V) => void;
}) {
  // Keep track of the last sent content to prevent loops
  const lastSentContent = useRef<V | null>(null);

  // Keep track of pending operations to batch them
  const pendingOps = useRef<V | null>(null);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);

  const sendServerMutation = api.notes.sendNoteChanges.useMutation();

  // Send changes to the server
  const sendChanges = useCallback(
    (content: V) => {
      // Skip if this is our own update
      if (
        lastSentContent.current &&
        isEqual(content, lastSentContent.current)
      ) {
        return;
      }

      // Update last sent content
      lastSentContent.current = content;

      // Send to server
      try {
        sendServerMutation.mutate({
          id: noteId,
          update: content,
        });
      } catch (error) {
        console.error("Failed to send changes:", error);
        // Reset last sent content on error to allow retry
        lastSentContent.current = null;
      }
    },
    [noteId, sendServerMutation],
  );

  // Batch and send changes
  const batchAndSendChanges = useCallback(
    (content: V) => {
      pendingOps.current = content;

      // Clear existing timeout
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      // Send changes in the next tick to batch multiple operations
      batchTimeout.current = setTimeout(() => {
        if (pendingOps.current) {
          sendChanges(pendingOps.current);
          pendingOps.current = null;
        }
      }, 0);
    },
    [sendChanges],
  );

  // Handle local changes
  const handleLocalChange = useCallback(
    (value: any) => {
      setNotesContent(value.value);
      batchAndSendChanges(value.value);
    },
    [setNotesContent, batchAndSendChanges],
  );

  // Subscribe to remote changes
  api.notes.subscribeToRealtimeNoteChanges.useSubscription(
    { id: noteId },
    {
      onData: (data) => {
        try {
          const remoteContent = data.data.update as V;

          // Skip if this is our own update
          //   if (
          //     lastSentContent.current &&
          //     isEqual(remoteContent, lastSentContent.current)
          //   ) {
          //     return;
          //   }

          // Apply remote changes immediately
          // Get and apply operations
          const operations = compareNodes.getDifferences(
            editor.children,
            remoteContent,
          );
          compareNodes.applyOperations(editor, operations);

          // Update store
          setNotesContent(editor.children);
        } catch (error) {
          console.error("Error handling remote update:", error);
        }
      },
    },
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
    };
  }, []);

  return {
    onChange: handleLocalChange,
  };
}
