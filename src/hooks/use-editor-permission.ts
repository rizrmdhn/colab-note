import { useEditorStore } from "@/store/editor.store";
import { api } from "@/trpc/react";
import { useEffect, useState } from "react";

interface UseEditorPermission {
  noteId: string;
}

export const useEditorPermission = ({ noteId }: UseEditorPermission) => {
  const [canEdit, setCanEdit] = useState(false);

  const editor = useEditorStore((state) => state.editor);

  const { data, status } = api.notes.getUserPermissions.useQuery({
    id: noteId,
  });

  useEffect(() => {
    if (!editor || status !== "success") return;

    const type = data.type;

    if (type === "viewer") {
      editor.setEditable(false);
      setCanEdit(false);
    } else {
      editor.setEditable(true);
      setCanEdit(true);
    }
  }, [data?.type, editor, status]);

  return {
    isViewer: data?.type === "viewer",
    canEdit,
  };
};
