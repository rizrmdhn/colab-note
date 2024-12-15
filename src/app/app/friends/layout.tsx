import { api, HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Friends - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function layout({ children }: { children: React.ReactNode }) {
  api.users.fetchAllUsers.prefetch();
  api.users.requestList.prefetch();
  api.users.friendList.prefetch();
  api.users.fetchMyDetails.prefetch();

  return <HydrateClient>{children}</HydrateClient>;
}
