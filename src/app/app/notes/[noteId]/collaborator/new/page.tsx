import CreateNewNoteForm from "@/components/create-new-note-form";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 xl:p-4">
      <h1 className="self-start text-3xl font-bold">Add a collaborator</h1>
      <CreateNewNoteForm />
    </div>
  );
}
