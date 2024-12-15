import { PlateEditor } from "@/components/editor/plate-editor";
import { HydrateClient } from "@/trpc/server";
import UpdateTitleForm from "./update-title-form";
import { Suspense } from "react";

export default async function Page({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const noteId = (await params).noteId;

  return (
    <HydrateClient>
      <div className="h-screen w-full" data-registry="plate">
        <UpdateTitleForm noteId={noteId} />
        <Suspense fallback={<div>Loading...</div>}>
          <PlateEditor noteId={noteId} />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
