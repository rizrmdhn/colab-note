"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEditorPermission } from "@/hooks/use-editor-permission";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { useNoteStore } from "@/store/notes.store";
import { api } from "@/trpc/react";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

interface UpdateTitleFormProps {
  noteId: string;
}
export default function UpdateTitleForm({ noteId }: UpdateTitleFormProps) {
  const utils = api.useUtils();

  const [notes] = api.notes.getNoteDetails.useSuspenseQuery({ id: noteId });

  const { canEdit } = useEditorPermission({ noteId });

  const setIsSaving = useNoteStore((state) => state.setIsSaving);

  const updateTitleNewNoteMutation = api.notes.updateTitle.useMutation({
    onMutate: () => {
      setIsSaving(true);
    },
    onSuccess: () => {
      globalSuccessToast("Title updated successfully");

      utils.notes.getAllNotes.invalidate();
      utils.notes.getNoteDetails.invalidate({ id: noteId });
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const form = useForm<{
    title: string;
  }>({
    disabled: !canEdit,
    defaultValues: {
      title: notes.title,
    },
  });

  function onSubmit(values: { title: string }) {
    if (!canEdit) return;

    updateTitleNewNoteMutation.mutate({ id: noteId, title: values.title });
  }

  return (
    <div className="flex flex-col items-center justify-center p-0 pb-4 pt-4 lg:p-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-row items-center justify-between gap-4"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Please enter the title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="mt-4"
            disabled={updateTitleNewNoteMutation.isPending || !canEdit}
          >
            {updateTitleNewNoteMutation.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Update
          </Button>
        </form>
      </Form>
    </div>
  );
}
