import { create } from "zustand";

interface NoteStore {
  noteId: string;
  setNoteId: (noteId: string) => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  noteId: "",
  setNoteId: (noteId) => set({ noteId }),
  isSaving: false,
  setIsSaving: (isSaving) => set({ isSaving }),
}));
