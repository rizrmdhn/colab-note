"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, getDateSeparator } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { Notes } from "@/types/notes";
import {
  endOfDay,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import NoteList from "./note-list";
import Link from "next/link";

export default function NotePage() {
  const [notes] = api.notes.getAllNotes.useSuspenseQuery();

  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const filteredNotes = notes
    .filter((notes) => {
      if (!date?.from) {
        return true;
      }

      const notesDate = parseISO(notes.createdAt);
      const start = startOfDay(date.from);
      const end = date.to ? endOfDay(date.to) : endOfDay(date.from);

      return isWithinInterval(notesDate, { start, end });
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const groupedNotes = filteredNotes.reduce(
    (acc, todo) => {
      const separator = getDateSeparator(new Date(todo.createdAt));
      if (!acc[separator]) {
        acc[separator] = [];
      }
      acc[separator].push(todo);
      return acc;
    },
    {} as Record<string, Notes[]>,
  );

  return (
    <section>
      <div className="flex items-center lg:w-4/5 xl:w-full">
        <h1 className="text-lg font-semibold md:text-2xl">Notes Page</h1>
      </div>
      <div className="flex flex-col flex-wrap gap-4 overflow-y-auto overflow-x-hidden p-4 lg:gap-6 lg:pb-2 lg:pl-6 lg:pr-6 lg:pt-2">
        <div className="mb-4 flex w-full flex-col space-y-4">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <Label
                htmlFor="date"
                className="whitespace-nowrap text-base font-semibold sm:text-lg"
              >
                Filter by date:
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal sm:w-[300px]",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(date.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={2}
                      className="hidden sm:block"
                    />
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={1}
                      className="sm:hidden"
                    />
                  </PopoverContent>
                </Popover>
                {date?.from && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDate(undefined)}
                    className="h-10 w-10"
                  >
                    <span className="sr-only">Clear date filter</span>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex w-full sm:w-auto">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/app/notes/new">Add New Note</Link>
              </Button>
            </div>
          </div>
        </div>
        {notes.length === 0 ? (
          <div className="w-full text-center text-base font-semibold sm:text-lg">
            No entries found
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="w-full text-center text-base font-semibold sm:text-lg">
            No entries found for the selected date range
          </div>
        ) : (
          <div className="w-full">
            <NoteList groupedNotes={groupedNotes} />
          </div>
        )}
      </div>
    </section>
  );
}
