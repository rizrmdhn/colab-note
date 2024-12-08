import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Colab Note - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
