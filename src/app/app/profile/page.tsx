import { getCurrentSession } from "@/lib/session";
import { api, HydrateClient } from "@/trpc/server";
import { redirect } from "next/navigation";
import UpdateProfileForm from "./update-form";

export default async function ProfilePage() {
  const { user } = await getCurrentSession();

  if (!user) {
    return redirect("/");
  }

  api.users.fetchMyDetails.prefetch();

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4 pl-7 pr-7 pt-4">
      <h1 className="text-2xl font-semibold">Update Profile</h1>
      <HydrateClient>
        <UpdateProfileForm />
      </HydrateClient>
    </div>
  );
}
