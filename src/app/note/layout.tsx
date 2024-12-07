import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type React from "react";

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  return children;
}
