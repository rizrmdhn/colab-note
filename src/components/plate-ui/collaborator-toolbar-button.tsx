"use client";

import React from "react";

import { ToolbarButton } from "./toolbar";
import { useEditorRef } from "@udecode/plate-common/react";
import { Users } from "lucide-react";
import Link from "next/link";
import { useNoteStore } from "@/store/notes.store";

export function CollaboratorToolbarButton() {
  const editor = useEditorRef();

  const noteId = useNoteStore((state) => state.noteId);

  if (!editor || !noteId) return null;

  return (
    <ToolbarButton tooltip="Add collaborator">
      <Link href={`/app/notes/${noteId}/collaborator/new`}>
        <Users />
      </Link>
    </ToolbarButton>
  );
}
