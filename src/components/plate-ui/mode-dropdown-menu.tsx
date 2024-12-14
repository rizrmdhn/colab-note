"use client";

import React from "react";

import { focusEditor, useEditorRef } from "@udecode/plate-common/react";
import { Eye, Pen } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  useOpenState,
} from "./dropdown-menu";
import { ToolbarButton } from "./toolbar";
import { useEditorPermissions } from "@/hooks/use-editor-permission";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";

type EditorMode = "editing" | "viewing";

interface ModeConfig {
  icon: React.ReactNode;
  label: string;
}

const MODES: Record<EditorMode, ModeConfig> = {
  editing: {
    icon: <Pen className="h-4 w-4" />,
    label: "Editing",
  },
  viewing: {
    icon: <Eye className="h-4 w-4" />,
    label: "Viewing",
  },
} as const;

interface ModeDropdownMenuProps
  extends React.ComponentProps<typeof DropdownMenu> {
  className?: string;
}

export function ModeDropdownMenu({
  className,
  ...props
}: ModeDropdownMenuProps) {
  const params = useParams<{ noteId: string }>();
  const editor = useEditorRef();
  const openState = useOpenState();

  const [permission] = api.notes.getUserPermissions.useSuspenseQuery({
    id: params.noteId,
  });

  const { canEdit, setReadOnly } = useEditorPermissions({
    editor,
    permission,
  });

  const currentMode: EditorMode = canEdit ? "editing" : "viewing";

  const handleModeChange = (newMode: string) => {
    if (newMode === "viewing") {
      setReadOnly(true);
      return;
    }

    if (newMode === "editing") {
      setReadOnly(false);
      focusEditor(editor);
      return;
    }
  };

  const renderModeContent = (mode: EditorMode) => (
    <>
      {MODES[mode].icon}
      <span className="ml-2 hidden lg:inline">{MODES[mode].label}</span>
    </>
  );

  return (
    <DropdownMenu modal={false} {...openState} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          pressed={openState.open}
          tooltip="Editing mode"
          isDropdown
          className={className}
        >
          {renderModeContent(currentMode)}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[180px]" align="start">
        <DropdownMenuRadioGroup
          value={currentMode}
          onValueChange={handleModeChange}
        >
          {(Object.keys(MODES) as EditorMode[]).map((mode) => (
            <DropdownMenuRadioItem
              key={mode}
              value={mode}
              disabled={mode === "editing" && !canEdit}
            >
              {renderModeContent(mode)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
