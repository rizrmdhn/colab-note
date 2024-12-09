import { Toaster } from "sonner";

import { PlateEditor } from "@/components/editor/plate-editor";
import { SettingsProvider } from "@/components/editor/settings";

export default async function Page({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const noteId = (await params).noteId;

  return (
    <div className="h-screen w-full" data-registry="plate">
      <SettingsProvider>
        <PlateEditor noteId={noteId} />
      </SettingsProvider>

      <Toaster />
    </div>
  );
}
