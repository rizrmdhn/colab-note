import type { PlainNoteCollaborator } from "@/types/note-collaborators";
import type { TEditor } from "@udecode/plate-common";
import { usePlateStore } from "@udecode/plate-common/react";
import { useEffect } from "react";

interface EditorPermissionsProps {
  editor: TEditor | null;
  permission: PlainNoteCollaborator;
}

export const useEditorPermissions = ({
  editor,
  permission,
}: EditorPermissionsProps) => {
  const plateStore = usePlateStore();

  const setReadOnly = usePlateStore().set.readOnly();

  useEffect(() => {
    if (!editor || !permission) return;

    if (permission.type === "viewer") {
      setReadOnly(true);
    } else {
      setReadOnly(false);
    }
  }, [editor, permission, plateStore, setReadOnly]);

  return {
    isReadOnly: permission?.type === "viewer",
    canEdit: permission?.type !== "viewer",
    setReadOnly,
  };
};
