import React, { use } from "react";

export default function ChatsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const param = use(params);

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Chats Page</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        {param.userId}
      </div>
    </section>
  );
}
