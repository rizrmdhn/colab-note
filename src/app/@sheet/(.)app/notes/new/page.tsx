import CreateNewNoteForm from "@/components/create-new-note-form";
import Sheets from "@/components/sheet";
import { SheetTitle } from "@/components/ui/sheet";

export default function addNewNoteSheets() {
  return (
    <Sheets className="max-w-lg xl:w-full">
      <div className="flex flex-col gap-4">
        <SheetTitle className="text-3xl font-bold">Add a new note</SheetTitle>
        <CreateNewNoteForm />
      </div>
    </Sheets>
  );
}
