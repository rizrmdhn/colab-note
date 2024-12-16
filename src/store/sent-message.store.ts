import { create } from "zustand";

interface useSentMessageRequestStore {
  id: string | null;
  setSentMessageId: (id: string | null) => void;
  content: string;
  setContent: (content: string) => void;
  isFocused: boolean;
  setIsFocused: (isFocused: boolean) => void;
}

export const useSentMessageRequestStore = create<useSentMessageRequestStore>(
  (set) => ({
    id: null,
    setSentMessageId: (id) => set({ id }),
    content: "",
    setContent: (content) => set({ content }),
    isFocused: false,
    setIsFocused: (isFocused) => set({ isFocused }),
  }),
);
