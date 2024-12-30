import { create } from "zustand";
import type { Editor } from "@tiptap/react";
import { TiptapCollabProvider } from "@hocuspocus/provider";
import type { Doc, Text } from "yjs";
import type { cursorColors } from "@/lib/constants";
import { env } from "@/env";

export type ConnectedUser = {
  id: string;
  name: string;
  color: (typeof cursorColors)[number];
};

interface EditorStore {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  provider: TiptapCollabProvider | null;
  setProvider: (provider: TiptapCollabProvider | null) => void;
  initProvider: (params: {
    noteId: string;
    ydoc: Doc;
    editor: Editor | null;
    userId: string;
    username: string;
    userColor: (typeof cursorColors)[number];
    callbacks: {
      onConnect: () => void;
      onDisconnect: () => void;
      onStatus: (status: any) => void;
      onSynced: (ytext: Text, currentEditor: Editor | null) => void;
    };
  }) => void;
  users: ConnectedUser | null;
  setUsers: (users: ConnectedUser) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  provider: null,
  setProvider: (provider) => set({ provider }),
  initProvider: (params) => {
    const baseUrl =
      env.NODE_ENV === "production"
        ? `https://${env.HOSTNAME}:${env.HOCUSPOCUS_PORT}`
        : "http://localhost:3001";

    const newProvider = new TiptapCollabProvider({
      appId: "collab-provider",
      name: params.noteId,
      document: params.ydoc,
      baseUrl: baseUrl,
      onConnect: params.callbacks.onConnect,
      onDisconnect: params.callbacks.onDisconnect,
      onStatus: params.callbacks.onStatus,
      onSynced: () =>
        params.callbacks.onSynced(params.ydoc.getText("content"), get().editor),
    });

    if (newProvider.awareness) {
      newProvider.awareness.setLocalStateField("user", {
        name: params.username,
        color: params.userColor,
      });
    }

    // set users
    set({
      users: {
        id: params.userId,
        name: params.username,
        color: params.userColor,
      },
    });

    set({ provider: newProvider });

    // Clean up old provider after a small delay
    const currentProvider = get().provider;
    if (currentProvider && currentProvider !== newProvider) {
      setTimeout(() => {
        currentProvider.destroy();
      }, 0);
    }
  },
  users: null,
  setUsers: (users) => set({ users: users }),
}));
