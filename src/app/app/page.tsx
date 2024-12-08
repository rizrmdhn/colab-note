import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  if (user) {
    redirect(`/app/${user.id}`);
  }
}
