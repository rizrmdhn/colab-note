import { create } from "zustand";
import type { Editor } from "@tiptap/react";

interface useEditorStore {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
}

export const useEditorStore = create<useEditorStore>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}));
