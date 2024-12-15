import CreateNewNoteCollaboratorForm from "@/components/create-new-collaborator-form";
import Sheets from "@/components/sheet";
import { SheetTitle } from "@/components/ui/sheet";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function addNewNoteSheets({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { user } = await getCurrentSession();
  const noteId = (await params).noteId;

  if (!user) {
    redirect("/");
  }

  return (
    <Sheets className="max-w-lg xl:w-full">
      <div className="flex flex-col gap-4">
        <SheetTitle className="text-3xl font-bold">
          Add a collaborator
        </SheetTitle>
        <CreateNewNoteCollaboratorForm noteId={noteId} userId={user.id} />
      </div>
    </Sheets>
  );
}
