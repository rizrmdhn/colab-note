import React from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <h1>{userId}</h1>
    </div>
  );
}
