"use client";

import { api } from "@/trpc/react";
import React, { Suspense, useEffect, useRef, useState } from "react";
import type { Content } from "@tiptap/react";
import { MinimalTiptapEditor } from "@/components/minimal-tiptap";
import { useEditorStore } from "@/store/editor.store";
import * as Y from "yjs";

interface TextEditorProps {
  noteId: string;
}

export default function TextEditor({ noteId }: TextEditorProps) {
  const [initialLoad, setInitialLoad] = useState(true);
  const lastSavedContent = useRef<Content>([]);
  const valueRef = useRef<Content>("Welcome to the text editor! 🚀"); // Sync with `value`
  const [value, setValue] = useState<Content>("Welcome to the text editor! 🚀");
  const [ydoc] = useState(() => new Y.Doc());
  const stateVectorRef = useRef<Uint8Array>(Y.encodeStateVector(ydoc));
  const editor = useEditorStore((state) => state.editor);

  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({
    id: noteId,
  });
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

  return (
    <Suspense fallback={<div>Loading...</div>}>
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
    </Suspense>
  );
}
