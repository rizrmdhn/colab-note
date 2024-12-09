"use client";

import React from "react";

import { ToolbarButton } from "./toolbar";
import { useEditorRef } from "@udecode/plate-common/react";
import { Save } from "lucide-react";
import { api } from "@/trpc/react";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";

export function SaveToolbarButton() {
  const utils = api.useUtils();
  const editor = useEditorRef();

  const saveNoteMutation = api.notes.create.useMutation({
    onSuccess: () => {
      globalSuccessToast("Note saved successfully");

      utils.notes.getAllNotes.invalidate();
    },
    onError: () => {
      globalErrorToast("Failed to save note");
    },
  });

  if (!editor) return null;

  return (
    <ToolbarButton
      tooltip="Save (⌘+⇧+S)"
      onClick={() => {
        // get current content
        const content = JSON.stringify(editor.children);

        // save the note
        saveNoteMutation.mutate({
          title: "Untitled Note",
          content,
        });
      }}
    >
      <Save />
    </ToolbarButton>
  );
}
