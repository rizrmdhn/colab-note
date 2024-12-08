import React from "react";
import { getCurrentSession } from "@/lib/session";
import Message from "./message";
import { redirect } from "next/navigation";
import { api, HydrateClient } from "@/trpc/server";

export default async function DetailChats({
  searchParams,
}: {
  searchParams: Promise<{ userId: string }>;
}) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  const userId = (await searchParams).userId;
  if (userId && userId.trim() !== "") {
    api.message.getMessages.prefetch({
      friendId: userId,
    });
  }

  return (
    <HydrateClient>
      <Message user={user} />
    </HydrateClient>
  );
}
