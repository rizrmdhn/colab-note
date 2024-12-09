import { create } from "zustand";

interface MessageRequestStore {
  lastEventId: false | null | string;
  setLastEventId: (lastEventId: false | null | string) => void;
}

export const messageRequestStore = create<MessageRequestStore>((set) => ({
  lastEventId: false,
  setLastEventId: (lastEventId) => set({ lastEventId }),
}));
