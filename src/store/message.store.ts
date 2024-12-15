import { create } from "zustand";

interface useMessageRequestStore {
  lastEventId: false | null | string;
  setLastEventId: (lastEventId: false | null | string) => void;
}

export const useMessageRequestStore = create<useMessageRequestStore>((set) => ({
  lastEventId: false,
  setLastEventId: (lastEventId) => set({ lastEventId }),
}));
