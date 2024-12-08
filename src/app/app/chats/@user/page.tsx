import React from "react";
import { getCurrentSession } from "@/lib/session";
import Message from "./message";
import { redirect } from "next/navigation";

export default async function DetailChats() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  return <Message user={user} />;
}
