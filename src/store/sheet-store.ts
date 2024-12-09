import { create } from "zustand";

interface SheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const sheetStore = create<SheetProps>((set) => ({
  open: true,
  setOpen: (open) => set({ open }),
}));
