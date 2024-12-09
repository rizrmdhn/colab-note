import { PlateEditor } from "@/components/editor/plate-editor";
import { SettingsProvider } from "@/components/editor/settings";
import { HydrateClient } from "@/trpc/server";

export default async function Page({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const noteId = (await params).noteId;

  return (
    <HydrateClient>
      <div className="h-screen w-full" data-registry="plate">
        <SettingsProvider>
          <PlateEditor noteId={noteId} />
        </SettingsProvider>
      </div>
    </HydrateClient>
  );
}
