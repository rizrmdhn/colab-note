"use client";

import { api } from "@/trpc/react";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Content } from "@tiptap/react";
import { MinimalTiptapEditor } from "@/components/minimal-tiptap";
import { useEditorStore } from "@/store/editor.store";
import * as Y from "yjs";
import type { CursorPosition } from "@/types/cursor-position";
import { cursorColors } from "@/lib/constants";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

interface TextEditorProps {
  noteId: string;
}

export default function TextEditor({ noteId }: TextEditorProps) {
  const [cursors, setCursors] = React.useState<Record<string, CursorPosition>>(
    {},
  );
  const [initialLoad, setInitialLoad] = useState(true);
  const lastSavedContent = useRef<Content>([]);
  const valueRef = useRef<Content>("Welcome to the text editor! 🚀"); // Sync with `value`
  const [value, setValue] = useState<Content>("Welcome to the text editor! 🚀");
  const [ydoc] = useState(() => new Y.Doc());
  const stateVectorRef = useRef<Uint8Array>(Y.encodeStateVector(ydoc));
  const editor = useEditorStore((state) => state.editor);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null);

  const userColor = useMemo(() => {
    return cursorColors[Math.floor(Math.random() * cursorColors.length)];
  }, []);

  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({
    id: noteId,
  });
  const [user] = api.users.fetchMyDetails.useSuspenseQuery();

  // Send cursor mutation
  const sendCursorMutation = api.notes.updateCursorPosition.useMutation();

  // Throttled cursor update function
  const [throttledSendCursor] = useDebouncedCallback(
    (x: number, y: number) => {
      sendCursorMutation.mutate({
        noteId,
        userId: user.id,
        username: user.username,
        x,
        y,
        lastUpdate: Date.now(),
      });
    },
    50, // Throttle to 50ms
  );

  // Handle cursor position changes
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!editorContainerRef.current) return;

      const rect = editorContainerRef.current.getBoundingClientRect();
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Calculate position as percentages
      const x = ((event.clientX + scrollLeft - rect.left) / rect.width) * 100;
      const y = ((event.clientY + scrollTop - rect.top) / rect.height) * 100;

      const hasMovedSignificantly =
        !lastMousePosition.current ||
        Math.abs(lastMousePosition.current.x - x) > 1 || // Adjust threshold for percentages
        Math.abs(lastMousePosition.current.y - y) > 1;

      if (hasMovedSignificantly) {
        lastMousePosition.current = { x, y };
        throttledSendCursor(x, y);
      }
    },
    [editorContainerRef, throttledSendCursor],
  );

  const handleCursorUpdate = useCallback(
    (cursorData: CursorPosition) => {
      if (cursorData.userId === user.id) return;

      setCursors((prev) => {
        // Only update if the cursor data is newer than what we have
        const existingCursor = prev[cursorData.userId];
        if (
          existingCursor &&
          existingCursor.lastUpdate >= cursorData.lastUpdate
        ) {
          return prev;
        }

        return {
          ...prev,
          [cursorData.userId]: cursorData,
        };
      });
    },
    [user.id],
  );

  // Handle cursor cleanup
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const editorContainer = editorContainerRef.current;
    editorContainer.addEventListener("mousemove", handleMouseMove);

    // Clean up stale cursors less frequently
    const cursorCleanupInterval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let hasChanges = false;
        const newCursors = { ...prev };

        Object.entries(newCursors).forEach(([key, cursor]) => {
          if (now - cursor.lastUpdate > 5000) {
            delete newCursors[key];
            hasChanges = true;
          }
        });

        // Only return new object if there were changes
        return hasChanges ? newCursors : prev;
      });
    }, 5000);

    return () => {
      editorContainer.removeEventListener("mousemove", handleMouseMove);
      clearInterval(cursorCleanupInterval);
    };
  }, [handleMouseMove, user.id]);

  const sendNoteChangeMutation = api.notes.sendNoteChanges.useMutation();

  // Sync `value` to `valueRef`
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Handle local updates from ydoc
  useEffect(() => {
    const updateHandler = (update: Uint8Array) => {
      // Update state vector after applying the local changes
      stateVectorRef.current = Y.encodeStateVector(ydoc);

      // Send the local update to the server
      sendNoteChangeMutation.mutate({
        id: noteId,
        update,
      });

      // Store the latest saved content
      lastSavedContent.current = valueRef.current;
    };

    ydoc.on("update", updateHandler);

    return () => {
      ydoc.off("update", updateHandler);
    };
  }, [noteId, sendNoteChangeMutation, ydoc]);

  // Set initial editor content
  useEffect(() => {
    if (notes && editor && initialLoad) {
      setValue(notes.content);
      editor.commands?.setContent(notes.content);

      // Store initial content and mark as loaded
      lastSavedContent.current = notes.content;
      setInitialLoad(false);
    }
  }, [editor, initialLoad, notes]);

  // Subscribe to real-time updates
  api.notes.subscribeToRealtimeNoteChanges.useSubscription(
    { id: noteId },
    {
      onData: (data) => {
        const { update } = data.data;

        // Apply updates only if there's a meaningful difference
        const diff = Y.diffUpdate(update, stateVectorRef.current);
        if (diff.length > 0) {
          Y.applyUpdate(ydoc, update);
          stateVectorRef.current = Y.encodeStateVector(ydoc);
        }
      },
    },
  );

  // Subscribe to cursor updates
  api.notes.subscribeToRealtimeCursorPosition.useSubscription(
    { id: noteId },
    {
      onData: (data) => {
        if (initialLoad) return;

        try {
          if (!data.data.position) {
            console.error("Invalid cursor data received:", data);
            return;
          }

          handleCursorUpdate(data.data.position);
        } catch (error) {
          console.error("Error handling cursor update:", error);
        }
      },
      onError: (error) => {
        console.error("Cursor subscription error:", error);
      },
    },
  );

  // Handle page unload/cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sync any unsaved changes to the server
      const unsavedUpdate = Y.encodeStateAsUpdate(ydoc, stateVectorRef.current);
      if (unsavedUpdate.length > 0) {
        sendNoteChangeMutation.mutate({
          id: noteId,
          update: unsavedUpdate,
        });
      }

      // Cleanup the Y.Doc instance
      ydoc.destroy();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      ydoc.destroy(); // Also destroy if the component unmounts
    };
  }, [noteId, sendNoteChangeMutation, ydoc]);

  const cursorElements = useMemo(() => {
    return Object.entries(cursors).map(([cursorId, cursorData]) => (
      <div
        key={cursorId}
        className="pointer-events-none absolute z-50"
        style={{
          left: `${cursorData.x}%`,
          top: `${cursorData.y}%`,
          transform: "translate(-50%, -50%)",
          transition: "all 0.12s cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        <div className="flex flex-col items-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill={userColor}
            style={{
              filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
              transition: "transform 0.05s ease-out",
            }}
          >
            <path d="M0 0L16 6L10 10L6 16L0 0Z" />
          </svg>
          <span
            className="mt-1 rounded-full px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200"
            style={{
              backgroundColor: userColor,
            }}
          >
            {cursorData.username}
          </span>
        </div>
      </div>
    ));
  }, [cursors, userColor]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="relative flex h-full flex-col">
        <div
          ref={editorContainerRef}
          className="relative flex-1 overflow-y-auto"
        >
          {cursorElements}
          <MinimalTiptapEditor
            value={value}
            onChange={setValue}
            ydoc={ydoc}
            ydocField="test-shared-text"
            className="h-full w-full"
            editorContentClassName="p-5"
            output="html"
            placeholder="Type your description here..."
            autofocus
            editable
            editorClassName="focus:outline-none"
          />
        </div>
      </div>
    </Suspense>
  );
}
