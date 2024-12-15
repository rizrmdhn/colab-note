import { api, HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Notes - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function layout({ children }: { children: React.ReactNode }) {
  api.notes.getAllNotes.prefetch();

  return <HydrateClient>{children}</HydrateClient>;
}
