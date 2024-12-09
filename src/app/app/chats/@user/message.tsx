"use client";

import type { Users } from "@/types/users";
import { useSearchParams } from "next/navigation";
import React from "react";
import MessageForm from "./message-form";

export default function Message({ user }: { user: Users }) {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  if (!userId || !user) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-gray-500">Select a friend to chat with</p>
      </div>
    );
  }

  // this should fill the parent height
  return <MessageForm userId={user.id} friendId={userId} />;
}
