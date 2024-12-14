import { Skeleton } from "./ui/skeleton";

export const UserListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((index) => (
      <div
        key={index}
        className="flex items-center space-x-4 rounded-lg border p-4"
      >
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>
    ))}
  </div>
);
