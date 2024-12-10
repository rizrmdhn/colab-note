import CreateNewNoteCollaboratorForm from "@/components/create-new-collaborator-form";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Page({
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
    <div className="flex flex-col items-center justify-center gap-4 xl:p-4">
      <h1 className="self-start text-3xl font-bold">Add a collaborator</h1>
      <CreateNewNoteCollaboratorForm noteId={noteId} userId={user.id} />
    </div>
  );
}
