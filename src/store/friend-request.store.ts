import { create } from "zustand";

interface useFriendRequestStore {
  lastEventId: false | null | string;
  setLastEventId: (lastEventId: false | null | string) => void;
}

export const useFriendRequestStore = create<useFriendRequestStore>((set) => ({
  lastEventId: false,
  setLastEventId: (lastEventId) => set({ lastEventId }),
}));
