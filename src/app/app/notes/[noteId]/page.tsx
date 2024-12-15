import { HydrateClient } from "@/trpc/server";
import UpdateTitleForm from "./update-title-form";
import TextEditor from "./text-editor";

export default async function Page({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const noteId = (await params).noteId;

  return (
    <HydrateClient>
      <div className="flex h-screen w-full flex-col overflow-auto">
        <UpdateTitleForm noteId={noteId} />
        <TextEditor noteId={noteId} />
      </div>
    </HydrateClient>
  );
}
