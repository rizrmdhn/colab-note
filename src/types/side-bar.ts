import { type StringWithAutocompleteOptions } from "./utils";

export type SideBarProps = {
  items: SideBarItems[];
};

type SideBarItemBase = {
  icon: React.ReactNode;
  title: string;
  href: string;
  type: StringWithAutocompleteOptions<"default" | "accordion">;
};

type AccordionItems = {
  icon: React.ReactNode;
  title: string;
  href: string;
};

type SideBarItemDefault = SideBarItemBase & {
  type: "default";
  accordionItems?: never;
};

type SideBarItemAccordion = SideBarItemBase & {
  type: "accordion";
  accordionItems: AccordionItems[]; // Required when type is "accordion"
};

export type SideBarItems = SideBarItemDefault | SideBarItemAccordion;

// Define the type for individual sub-items in the navigation menu
export type NavSubItem = {
  title: string;
  url: string;
  icon?: React.ReactNode; // Icons are optional
  onHover?: () => void; // Optional function to run on hover
};

// Define the type for main items in the navigation menu, which may have sub-items
export type NavMainItem = {
  title: string;
  url: string;
  icon?: React.ReactNode; // Icons are optional
  isActive?: boolean; // Optional field for marking active state
  items?: NavSubItem[]; // Optional array of sub-items
};

// Define the type for the navMain data structure
export type NavMainData = NavMainItem[];
