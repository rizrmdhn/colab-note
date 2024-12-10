"use client";

import { cn, globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { useSheetStore } from "@/store/sheet-store";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react";
import { createNoteCollaboratorSchema } from "@/schema/note-collaborators";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { AVALIABLE_COLLABORATOR_TYPE } from "@/lib/constants";

interface CreateNewNoteFormProps {
  noteId: string;
  userId: string;
}

export default function CreateNewNoteCollaboratorForm({
  noteId,
  userId,
}: CreateNewNoteFormProps) {
  const utils = api.useUtils();

  const router = useRouter();

  const setOpen = useSheetStore((state) => state.setOpen);

  const [users] = api.users.friendList.useSuspenseQuery();

  const createNewNoteCollaboratorMutation =
    api.noteCollaborator.create.useMutation({
      onSuccess: () => {
        globalSuccessToast("Collaborator successfully added");

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

  const form = useForm<z.infer<typeof createNoteCollaboratorSchema>>({
    resolver: zodResolver(createNoteCollaboratorSchema),
    defaultValues: {
      noteId: noteId,
      userId: "",
      type: "viewer",
    },
  });

  function onSubmit(values: z.infer<typeof createNoteCollaboratorSchema>) {
    createNewNoteCollaboratorMutation.mutate(values);
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
              name="userId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Friends</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value
                            ? (() => {
                                const selectedUser = users.list.find(
                                  (user) =>
                                    user.userId === field.value ||
                                    user.friendId === field.value,
                                );

                                if (!selectedUser) return "Select a friend";

                                const isCurrentUser =
                                  selectedUser.userId === userId;
                                const displayUser = isCurrentUser
                                  ? selectedUser.friends
                                  : selectedUser.users;

                                return (
                                  displayUser?.username || "Select a friend"
                                );
                              })()
                            : "Select a friend"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="popover-content-width-full p-0">
                      <Command>
                        <CommandInput placeholder="Search friends..." />
                        <CommandList>
                          <CommandEmpty>No friends found.</CommandEmpty>
                          <CommandGroup>
                            {users.list.map((user) => {
                              const isCurrentUser = user.userId === userId;
                              const friendOrUser = isCurrentUser
                                ? user.friends
                                : user.users;

                              return (
                                <CommandItem
                                  value={friendOrUser?.id}
                                  key={user.id}
                                  onSelect={() => {
                                    form.setValue("userId", friendOrUser?.id);
                                  }}
                                >
                                  {friendOrUser?.name}
                                  <Check
                                    className={cn(
                                      "ml-auto",
                                      field.value === friendOrUser?.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of collaborator</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Collaborator Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVALIABLE_COLLABORATOR_TYPE.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="mt-4"
              disabled={createNewNoteCollaboratorMutation.isPending}
            >
              {createNewNoteCollaboratorMutation.isPending ? (
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
