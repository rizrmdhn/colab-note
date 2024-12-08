import { getCurrentSession } from "@/lib/session";
import LoginForm from "./login-form";
import { redirect } from "next/navigation";

export default async function Page() {
  const { user } = await getCurrentSession();

  if (user) {
    redirect(`/app`);
  }

  return (
    <div className="flex h-screen w-full items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
