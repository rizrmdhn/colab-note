"use client";

import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { NavMainItem } from "@/types/side-bar";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function NavMain({ items }: { items: NavMainItem[] }) {
  const path = usePathname();

  // Helper function to check if a URL matches the current path
  const isUrlActive = (url: string): boolean => {
    // Exact match for root app path
    if (url === "/app" && path === "/app") {
      return true;
    }
    // For other paths, check if the current path starts with the URL
    // but make sure it's at a path boundary
    if (url !== "/app") {
      return path.startsWith(url + "/") || path === url;
    }
    return false;
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={
                isUrlActive(item.url) ||
                item.items.some((subItem) => isUrlActive(subItem.url))
              }
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={
                      isUrlActive(item.url) ||
                      item.items.some((subItem) => isUrlActive(subItem.url))
                    }
                  >
                    {item.icon && item.icon}
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isUrlActive(subItem.url)}
                        >
                          <Link href={subItem.url}>
                            <span className="truncate">{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isUrlActive(item.url)}
              >
                <Link href={item.url}>
                  {item.icon && item.icon}
                  <span className="truncate">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
