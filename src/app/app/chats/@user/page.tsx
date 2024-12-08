"use client";

import { useSearchParams } from "next/navigation";
import React from "react";

export default function DetailChats() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  if (!userId) {
    return null;
  }

  return (
    <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
      Hello {userId}
    </div>
  );
}
