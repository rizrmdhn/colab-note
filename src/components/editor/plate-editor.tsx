"use client";

import React, { useCallback, useEffect, useRef } from "react";
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

export function PlateEditor({ noteId }: { noteId: string }) {
  // State management
  const [initialLoad, setInitialLoad] = React.useState(true);
  const setNotesContent = useNoteStore((state) => state.setNoteContent);
  const setNoteId = useNoteStore((state) => state.setNoteId);
  const lastSavedContent = useRef<Node[]>([]);

  // Create editor
  const editor = useCreateEditor();

  // Create operation batcher
  const batcher = useBatchedOperations(editor);

  // Fetch initial note data
  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({
    id: noteId,
  });

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
          if (!data.update) {
            console.error("Invalid data received:", data);
            return;
          }

          // Ensure content is an array
          const remoteContent = Array.isArray(data.update)
            ? data.update
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

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate editor={editor} onValueChange={handleValueChange}>
        <EditorContainer className="caret-black dark:caret-white">
          <Editor variant="demo" />
        </EditorContainer>
        <SettingsDialog />
      </Plate>
    </DndProvider>
  );
}
