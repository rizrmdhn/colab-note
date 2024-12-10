import { api, HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Notes - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ noteId: string }>;
}) {
  const noteId = (await params).noteId;

  api.notes.getNoteDetails.prefetch({ id: noteId });
  api.users.friendList.prefetch();

  return <HydrateClient>{children}</HydrateClient>;
}
