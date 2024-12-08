import { getCurrentSession } from "@/lib/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type React from "react";

export const metadata: Metadata = {
  title: "Register - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (user) {
    redirect(`/app/${user.id}`);
  }

  return children;
}
