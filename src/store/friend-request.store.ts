import { create } from "zustand";

interface FriendRequestStore {
  lastEventId: false | null | string;
  setLastEventId: (lastEventId: false | null | string) => void;
}

export const friendRequestStore = create<FriendRequestStore>((set) => ({
  lastEventId: false,
  setLastEventId: (lastEventId) => set({ lastEventId }),
}));
