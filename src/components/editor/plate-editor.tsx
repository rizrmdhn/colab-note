"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate-common/react";
import { useCreateEditor } from "@/components/editor/use-create-editor";
import { SettingsDialog } from "@/components/editor/settings";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";
import { api } from "@/trpc/react";
import { useNoteStore } from "@/store/notes.store";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { Node } from "slate";
import { isEqual } from "lodash";
import { compareNodes } from "@/lib/diff";
import { useBatchedOperations } from "@/hooks/use-batched-operations";
import { cursorColors } from "@/lib/constants";
import type { CursorPosition } from "@/types/cursor-position";

export function PlateEditor({ noteId }: { noteId: string }) {
  // State management
  const [initialLoad, setInitialLoad] = React.useState(true);
  const [cursors, setCursors] = React.useState<Record<string, CursorPosition>>(
    {},
  );
  const setNotesContent = useNoteStore((state) => state.setNoteContent);
  const setNoteId = useNoteStore((state) => state.setNoteId);
  const lastSavedContent = useRef<Node[]>([]);
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null);

  const userColor = useMemo(() => {
    return cursorColors[Math.floor(Math.random() * cursorColors.length)];
  }, []);

  // Create editor
  const editor = useCreateEditor();

  // editor container ref
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Create operation batcher
  const batcher = useBatchedOperations(editor);

  // Fetch initial note data
  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({
    id: noteId,
  });
  const [user] = api.users.fetchMyDetails.useSuspenseQuery();

  // Initialize content when notes are loaded
  useEffect(() => {
    if (notes && initialLoad && editor) {
      try {
        // Ensure we have valid content
        const initialContent = Array.isArray(notes.content)
          ? notes.content
          : [{ type: "p", children: [{ text: "" }] }];

        // Set the content in the store
        setNotesContent(initialContent);
        setNoteId(notes.id);

        // Set editor content

        // eslint-disable-next-line react-compiler/react-compiler
        editor.children = initialContent;
        editor.onChange();

        // Store initial content for comparison
        lastSavedContent.current = initialContent;

        setInitialLoad(false);
      } catch (error) {
        console.error("Error initializing content:", error);
        // Recover with default empty state
        const defaultState = [{ type: "p", children: [{ text: "" }] }];
        setNotesContent(defaultState);
        editor.children = defaultState;
        editor.onChange();
        setInitialLoad(false);
      }
    }
  }, [editor, initialLoad, notes, setNoteId, setNotesContent]);

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
    0, // Throttle to 100ms
  );

  // Handle cursor position changes
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!editorContainerRef.current) return;

      const rect = editorContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Only update if position has changed significantly (optional optimization)
      const hasMovedSignificantly =
        !lastMousePosition.current ||
        Math.abs(lastMousePosition.current.x - x) > 5 ||
        Math.abs(lastMousePosition.current.y - y) > 5;

      if (
        hasMovedSignificantly &&
        x >= 0 &&
        y >= 0 &&
        x <= rect.width &&
        y <= rect.height
      ) {
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

  // const handleUserDisconnect = (userId: string) => {
  //   setCursors((prev) => {
  //     const newCursors = { ...prev };
  //     delete newCursors[userId];
  //     return newCursors;
  //   });
  // };

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

  // Send changes mutation
  const sendNoteChangesMutation = api.notes.sendNoteChanges.useMutation();

  // Debounced change handler for local updates with batch processing
  const [debouncedSendChanges] = useDebouncedCallback((content: Node[]) => {
    // Get operations for local changes
    const currentContent = editor.children;
    const operations = compareNodes.getDifferences(currentContent, content);

    // Add to batch and send to server
    batcher.addOperations(operations);

    sendNoteChangesMutation.mutate({
      id: noteId,
      update: content,
    });

    lastSavedContent.current = content;
  }, 500);

  // Subscribe to remote changes
  api.notes.subscribeToRealtimeNoteChanges.useSubscription(
    { id: noteId },
    {
      onData: (data) => {
        if (initialLoad) return;

        try {
          // Validate the data structure
          if (!data.data.update) {
            console.error("Invalid data received:", data);
            return;
          }

          // Ensure content is an array
          const remoteContent = Array.isArray(data.data.update)
            ? data.data.update
            : [{ type: "p", children: [{ text: "" }] }];

          // Skip if this is our own update
          if (isEqual(remoteContent, lastSavedContent.current)) {
            return;
          }

          // Get operations and add to batch
          const operations = compareNodes.getDifferences(
            editor.children,
            remoteContent,
          );

          // Add operations to batch instead of applying directly
          batcher.addOperations(operations);

          // Update store after batch is applied (handled by batcher callback)
          setNotesContent(editor.children);
        } catch (error) {
          console.error("Error handling realtime update:", error);
          console.error("Error details:", {
            data,
            currentContent: editor.children,
            lastSavedContent: lastSavedContent.current,
          });
        }
      },
      onError: (error) => {
        console.error("Subscription error:", error);
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

  // Handle local changes
  const handleValueChange = useCallback(
    (value: any) => {
      if (initialLoad) return;

      try {
        // Validate value structure
        if (!Array.isArray(value.value)) {
          console.error("Invalid value structure:", value.value);
          return;
        }

        // Update store with new value
        setNotesContent(value.value);

        // Send changes to server
        debouncedSendChanges(value.value);
      } catch (error) {
        console.error("Error handling value change:", error);
      }
    },
    [debouncedSendChanges, initialLoad, setNotesContent],
  );

  const cursorElement = useMemo(() => {
    return Object.entries(cursors).map(([cursorId, cursorData]) => (
      <div
        key={cursorId}
        className="pointer-events-none absolute z-50"
        style={{
          left: `${cursorData.x}px`,
          top: `${cursorData.y}px`,
          transform: "translate(-50%, -50%)",
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
            }}
          >
            <path d="M0 0L16 6L10 10L6 16L0 0Z" />
          </svg>
          <span
            className="mt-1 rounded-full px-2 py-1 text-xs text-white"
            style={{ backgroundColor: userColor }}
          >
            {cursorData.username}
          </span>
        </div>
      </div>
    ));
  }, [cursors, userColor]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate editor={editor} onValueChange={handleValueChange}>
        <EditorContainer className="caret-black dark:caret-white">
          <div ref={editorContainerRef} className="relative h-full">
            {/* Cursor Elements */}
            {cursorElement}
            <Editor variant="demo" />
          </div>
        </EditorContainer>
        <SettingsDialog />
      </Plate>
    </DndProvider>
  );
}
