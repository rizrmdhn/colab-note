import type { Node } from "slate";
import { create } from "zustand";

interface NoteStore {
  noteId: string;
  setNoteId: (noteId: string) => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  noteContent: Node[] | null;
  setNoteContent: (noteContent: Node[] | null) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  noteId: "",
  setNoteId: (noteId) => set({ noteId }),
  isSaving: false,
  setIsSaving: (isSaving) => set({ isSaving }),
  noteContent: null,

  setNoteContent: (noteContent) => set({ noteContent }),
}));
