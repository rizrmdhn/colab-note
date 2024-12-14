import { useDebounce } from "@/hooks/use-debounce";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/trpc/react";
import React from "react";
import { useForm } from "react-hook-form";
import { InputIcon } from "@/components/ui/input-icon";
import { LoaderCircle, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchForm() {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 500);

  const { data, isPending } = api.users.searchUsers.useQuery(
    {
      query: debouncedQuery,
    },
    {
      enabled: !!debouncedQuery && debouncedQuery.trim().length > 0,
    },
  );

  const form = useForm<{
    query: string;
  }>({
    defaultValues: {
      query: "",
    },
    mode: "onChange",
  });

  // Watch for changes in the query field
  const watchedQuery = form.watch("query");

  // Update search query when input changes
  React.useEffect(() => {
    setQuery(watchedQuery);
  }, [watchedQuery]);

  function onSubmit(values: { query: string }) {
    setQuery(values.query);
  }

  return (
    <div className="flex flex-col items-center justify-center pt-2">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-row items-center justify-between gap-4"
        >
          <FormField
            control={form.control}
            name="query"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <InputIcon
                    className="w-full"
                    type="text"
                    icon={SearchIcon}
                    iconProps={{
                      behavior: "prepend",
                    }}
                    placeholder="Please enter the search query"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-4" disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Search
          </Button>
        </form>
      </Form>
    </div>
  );
}
