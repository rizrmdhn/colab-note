import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { globalErrorToast, globalSuccessToast } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { Notes } from "@/types/notes";
import { format, parseISO } from "date-fns";
import { Calendar, LoaderCircleIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

interface NoteListProps {
  groupedNotes: Record<string, Notes[]>;
}

export default function NoteList({ groupedNotes }: NoteListProps) {
  const utils = api.useUtils();
  const [todoToDelete, setTodoToDelete] = useState<string | null>(null);

  const deleteNoteMutation = api.notes.delete.useMutation({
    onSuccess: () => {
      globalSuccessToast("Note deleted successfully");

      utils.notes.getAllNotes.invalidate();
    },
    onError: (error) => {
      globalErrorToast(error.message);
    },
    onSettled: () => {
      setTodoToDelete(null);
    },
  });

  const TodoActionButtons = ({
    todo,
    isMobile = false,
  }: {
    todo: Notes;
    isMobile?: boolean;
  }) => (
    <div
      className={`${
        isMobile ? "flex md:hidden" : "hidden md:flex"
      } items-center gap-2`}
    >
      <Link
        href={`/app/notes/${todo.id}`}
        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        Edit
      </Link>
      <AlertDialog
        open={todoToDelete === todo.id}
        onOpenChange={(isOpen) => {
          if (!isOpen) setTodoToDelete(null);
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:bg-red-100 hover:text-red-600"
            disabled={false}
            onClick={() => setTodoToDelete(todo.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete todo</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              todo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteNoteMutation.mutate({
                  id: todo.id,
                });
              }}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {false && (
                <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="w-full">
      {Object.entries(groupedNotes).map(([separator, todos]) => (
        <div key={separator} className="mb-4 lg:mb-8">
          <Separator className="my-2 md:my-4" />
          <h2 className="mb-2 text-lg font-semibold text-primary md:mb-4 md:text-xl lg:text-2xl">
            {separator}
          </h2>
          <div className="space-y-2 md:space-y-4">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="group flex flex-col gap-2 rounded-lg border border-transparent bg-secondary p-3 transition-all hover:border-primary/10 hover:shadow-lg md:flex-row md:items-start md:gap-4 md:p-4 lg:p-5"
              >
                {/* Status button container */}
                <div className="flex w-full justify-between md:w-auto md:flex-col">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`hover:bg-secondary-foreground/10`}
                        >
                          {/* {todo.isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                          ) : (
                            <XCircle className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                          )} */}
                          {/* <span className="sr-only">
                            {todo.isCompleted
                              ? "Mark as incomplete"
                              : "Mark as complete"}
                          </span> */}
                        </Button>
                      </TooltipTrigger>
                      {/* <TooltipContent>
                        <p>
                          {todo.isCompleted
                            ? "Mark as incomplete"
                            : "Mark as complete"}
                        </p>
                      </TooltipContent> */}
                    </Tooltip>
                  </TooltipProvider>

                  <TodoActionButtons todo={todo} isMobile={true} />
                </div>

                {/* Content container with width constraints */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="space-y-1 md:space-y-2 lg:space-y-3">
                    <h3
                      className={`w-full truncate text-sm font-semibold md:text-base lg:text-lg`}
                      title={todo.title}
                    >
                      {todo.title}
                    </h3>
                    {/* <p className="w-full break-words text-xs text-muted-foreground md:text-sm lg:text-base">
                      {todo.content}
                    </p> */}
                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                      <Badge
                        variant="outline"
                        className="whitespace-nowrap text-[10px] md:text-xs"
                      >
                        <Calendar className="mr-1 h-3 w-3 md:h-3.5 md:w-3.5" />
                        {format(parseISO(todo.createdAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </div>
                </div>

                <TodoActionButtons todo={todo} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
