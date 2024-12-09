"use client";

import React from "react";

import { ToolbarButton } from "./toolbar";
import { useEditorRef } from "@udecode/plate-common/react";
import { LoaderCircle, Save } from "lucide-react";
import { api } from "@/trpc/react";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { useNoteStore } from "@/store/notes.store";

export function SaveToolbarButton() {
  const utils = api.useUtils();
  const editor = useEditorRef();

  const isSaving = useNoteStore((state) => state.isSaving);

  const setIsSaving = useNoteStore((state) => state.setIsSaving);

  const noteId = useNoteStore((state) => state.noteId);

  const { data: notes } = api.notes.getNoteDetails.useQuery(
    {
      id: noteId,
    },
    {
      enabled: !!noteId,
    },
  );

  const saveNoteMutation = api.notes.create.useMutation({
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      globalSuccessToast("Note saved successfully");

      utils.notes.getAllNotes.invalidate();
    },
    onError: (error) => {
      globalErrorToast("Failed to save note: " + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const updateNoteMutation = api.notes.update.useMutation({
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      globalSuccessToast("Note saved successfully");

      utils.notes.getAllNotes.invalidate();
      utils.notes.getNoteDetails.invalidate({ id: noteId });
    },
    onError: (error) => {
      globalErrorToast("Failed to save note: " + error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  if (!editor || !noteId || !notes) return null;

  return (
    <ToolbarButton
      tooltip="Save (⌘+⇧+S)"
      onClick={() => {
        // get current content
        const content = JSON.stringify(editor.children);

        // save the note
        if (notes.content === content) return;

        if (!noteId) {
          saveNoteMutation.mutate({
            title: notes.title,
            content,
          });
        } else {
          updateNoteMutation.mutate({
            id: noteId,
            title: notes.title,
            content,
          });
        }
      }}
    >
      {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
    </ToolbarButton>
  );
}
