import type { Metadata } from "next";
import type React from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { NavMainItem } from "@/types/side-bar";
import { HomeIcon, ListTodo, MessageSquareText, Users } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ListenNewFriendRequest from "./listen-new-friend-request";
import ListenNewMessage from "./listen-new-message";

export const metadata: Metadata = {
  title: "Colab Note - Collaborative Note Taking",
  description:
    "Colab Note is a collaborative note taking app created with Next.js and Tailwind CSS.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const menuItems: NavMainItem[] = [
  {
    title: "Dashboard",
    url: "/app",
    icon: <HomeIcon />, // JSX component
    items: [], // No sub-items for Dashboard
  },
  {
    title: "Notes",
    url: "/app/notes",
    icon: <ListTodo />, // JSX component
    items: [], // No sub-items for Dashboard
  },
  {
    title: "Chats",
    url: "/app/chats",
    icon: <MessageSquareText />, // JSX component
    items: [], // No sub-items for Dashboard
  },
  {
    title: "Friends",
    url: "/app/friends",
    icon: <Users />, // JSX component
    items: [
      {
        title: "All Friends",
        url: "/app/friends",
      },
      {
        title: "Add Friend",
        url: "/app/friends/add",
      },
      {
        title: "Friend Requests",
        url: "/app/friends/requests",
      },
    ], // No sub-items for Dashboard
  },
];

export default async function layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (!user) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar data={menuItems} user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
          <ListenNewFriendRequest user={user} />
          {/* <ListenNewMessage user={user} /> */}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
