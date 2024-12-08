import { api, HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Chats - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function layout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: React.ReactNode;
}) {
  api.users.friendList.prefetch();

  return (
    <HydrateClient>
      <section className="flex flex-1 flex-col">
        <div className="flex items-center lg:w-4/5 xl:w-full">
          <h1 className="text-lg font-semibold md:text-2xl">Chats Page</h1>
        </div>
        <div className="flex flex-1 flex-row gap-4 overflow-y-auto p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
          <div className="w-1/5 overflow-y-auto">{children}</div>
          <div className="w-4/5 overflow-y-auto border-l-2 border-gray-200 pl-4 dark:border-gray-700">
            {user}
          </div>
        </div>
      </section>
    </HydrateClient>
  );
}
