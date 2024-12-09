"use client";

import React, { useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate-common/react";
import { useCreateEditor } from "@/components/editor/use-create-editor";
import { SettingsDialog } from "@/components/editor/settings";
import { Editor, EditorContainer } from "@/components/plate-ui/editor";
import { api } from "@/trpc/react";
import { useNoteStore } from "@/store/notes.store";

export function PlateEditor({ noteId }: { noteId: string }) {
  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({
    id: noteId,
  });

  const setNoteId = useNoteStore((state) => state.setNoteId);

  const editor = useCreateEditor(notes?.content);

  useEffect(() => {
    if (notes) {
      setNoteId(notes.id);
    }
  }, [notes, setNoteId]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Plate editor={editor}>
        <EditorContainer className="caret-black dark:caret-white">
          <Editor variant="demo" />
        </EditorContainer>

        <SettingsDialog />
      </Plate>
    </DndProvider>
  );
}
