"use client";

import { DEFAULT_EDITOR_VALUES } from "@/lib/constants";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { createNoteSchema } from "@/schema/notes";
import { sheetStore } from "@/store/sheet-store";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useStore } from "zustand";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { LoaderCircle } from "lucide-react";

export default function CreateNewNoteForm() {
  const utils = api.useUtils();

  const router = useRouter();

  const setOpen = useStore(sheetStore, (state) => state.setOpen);

  const createNewNoteMutation = api.notes.create.useMutation({
    onSuccess: () => {
      globalSuccessToast("Ruang Lingkup successfully created");

      setOpen(false);

      setTimeout(() => {
        utils.notes.getAllNotes.invalidate();
        router.back();
        setOpen(true);
      }, 300);
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
  });

  const form = useForm<z.infer<typeof createNoteSchema>>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: "",
      content: JSON.stringify(DEFAULT_EDITOR_VALUES),
    },
  });

  function onSubmit(values: z.infer<typeof createNoteSchema>) {
    createNewNoteMutation.mutate(values);
  }

  return (
    <ScrollArea className="flex w-full flex-col items-center justify-center overflow-y-auto">
      <div className="flex flex-col items-center justify-center p-0 pb-4 pt-4 lg:p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex w-full flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
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
              disabled={createNewNoteMutation.isPending}
            >
              {createNewNoteMutation.isPending ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </form>
        </Form>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
