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
import type { Content, Editor } from "@tiptap/react";
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
  const [value, setValue] = useState<Content>();
  const [ydoc] = useState(() => new Y.Doc());
  const editor = useEditorStore((state) => state.editor);
  const provider = useEditorStore((state) => state.provider);
  const initProvider = useEditorStore((state) => state.initProvider);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMousePosition = useRef<{ x: number; y: number } | null>(null);
  const providerStatusRef = useRef<string>("disconnected");
  const initialSyncDoneRef = useRef(false);
  const [, setLastSyncedContent] = useState<Content>(null);
  const hasLocalChangesRef = useRef(false);

  const userColor = useMemo(() => {
    return (
      cursorColors[Math.floor(Math.random() * cursorColors.length)] ??
      cursorColors[0]
    );
  }, []);

  const { data: notes, isLoading } = api.notes.getNoteDetails.useQuery(
    {
      id: noteId,
    },
    {
      suspense: false,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );
  const [user] = api.users.fetchMyDetails.useSuspenseQuery();

  const handleConnect = useCallback(() => {
    providerStatusRef.current = "connected";
    // set users connected to the document
  }, []);

  const handleDisconnect = useCallback(() => {
    providerStatusRef.current = "disconnected";
  }, []);

  const handleStatus = useCallback((status: { status: string }) => {
    providerStatusRef.current = status.status;
  }, []);

  const handleSynced = useCallback(
    (ytext: Y.Text, currentEditor: Editor | null) => {
      if (!initialSyncDoneRef.current) {
        if (ytext.length > 0) {
          // Use the collaborative content if it exists
          const ytextContent = ytext.toString();
          currentEditor?.commands.setContent(ytextContent);
        } else if (notes?.content) {
          // Set initial content and update ytext
          currentEditor?.commands.setContent(notes.content);
          ytext.insert(0, notes.content as string);
        }
        initialSyncDoneRef.current = true;
      }
    },
    [notes?.content],
  );

  useEffect(() => {
    initProvider({
      noteId,
      ydoc,
      editor,
      userId: user.id,
      username: user.username,
      userColor,
      callbacks: {
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onStatus: handleStatus,
        onSynced: handleSynced,
      },
    });
  }, [
    editor,
    handleConnect,
    handleDisconnect,
    handleStatus,
    handleSynced,
    initProvider,
    noteId,
    user.id,
    user.username,
    userColor,
    ydoc,
  ]);

  // Handle provider reconnection
  useEffect(() => {
    if (!provider) return;

    const reconnectInterval = setInterval(() => {
      if (providerStatusRef.current === "disconnected") {
        console.log("Attempting to reconnect provider...");
        provider.disconnect();
        provider.connect();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(reconnectInterval);
    };
  }, [provider]);

  // Track local changes
  useEffect(() => {
    if (!editor) return;

    const updateHandler = () => {
      hasLocalChangesRef.current = true;
    };

    editor.on("update", updateHandler);

    return () => {
      editor.off("update", updateHandler);
    };
  }, [editor]);

  // Handle content synchronization
  useEffect(() => {
    if (!editor || !notes?.content) return;

    const ytext = ydoc.getText("content");

    if (
      ytext.length === 0 &&
      !hasLocalChangesRef.current &&
      !initialSyncDoneRef.current
    ) {
      // Only set initial content if we have no local changes and no collaborative content
      setValue(notes.content);
      editor.commands.setContent(notes.content);
      setLastSyncedContent(notes.content);
    }
  }, [editor, notes?.content, ydoc]);

  // Send cursor mutation
  const sendCursorMutation = api.notes.updateCursorPosition.useMutation();

  // Throttled cursor update function
  const [throttledSendCursor] = useDebouncedCallback((x: number, y: number) => {
    sendCursorMutation.mutate({
      noteId,
      userId: user.id,
      username: user.username,
      x,
      y,
      lastUpdate: Date.now(),
    });
  }, 50);

  // Handle cursor position changes
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!editorContainerRef.current) return;

      const rect = editorContainerRef.current.getBoundingClientRect();
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const x = ((event.clientX + scrollLeft - rect.left) / rect.width) * 100;
      const y = ((event.clientY + scrollTop - rect.top) / rect.height) * 100;

      const hasMovedSignificantly =
        !lastMousePosition.current ||
        Math.abs(lastMousePosition.current.x - x) > 1 ||
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

  // Initialize editor content
  useEffect(() => {
    if (!editor || !notes?.content) return;

    const ytext = ydoc.getText("content");

    // Only set initial content if we're the first user
    if (ytext.length === 0 && !initialSyncDoneRef.current) {
      setValue(notes.content);
      editor.commands.setContent(notes.content);
    }
  }, [editor, notes?.content, ydoc]);

  // Reset sync flag when noteId changes
  useEffect(() => {
    initialSyncDoneRef.current = false;
    return () => {
      initialSyncDoneRef.current = false;
    };
  }, [noteId]);

  // Handle cursor cleanup
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const editorContainer = editorContainerRef.current;
    editorContainer.addEventListener("mousemove", handleMouseMove);

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

        return hasChanges ? newCursors : prev;
      });
    }, 5000);

    return () => {
      editorContainer.removeEventListener("mousemove", handleMouseMove);
      clearInterval(cursorCleanupInterval);
    };
  }, [handleMouseMove]);

  // Subscribe to cursor updates
  api.notes.subscribeToRealtimeCursorPosition.useSubscription(
    { id: noteId },
    {
      onData: (data) => {
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

  if (isLoading || !provider) {
    return <div>Loading...</div>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <div
          ref={editorContainerRef}
          className="relative flex h-full w-full flex-col items-center overflow-hidden p-0 pb-4 pt-4 lg:p-4"
        >
          {cursorElements}
          <MinimalTiptapEditor
            value={value}
            onChange={(newValue) => {
              setValue(newValue);
              if (editor && initialSyncDoneRef.current) {
                // Only update after initial sync
                const currentContent = editor.getHTML();
                const ytext = ydoc.getText("content");
                if (currentContent !== ytext.toString()) {
                  ytext.delete(0, ytext.length);
                  ytext.insert(0, currentContent);
                }
              }
            }}
            ydoc={ydoc}
            className="h-full w-full overflow-y-auto"
            editorContentClassName="p-5 h-full overflow-y-auto"
            output="html"
            placeholder="Type your description here..."
            autofocus
            editable
            editorClassName="focus:outline-none h-full"
          />
        </div>
      </div>
    </Suspense>
  );
}
