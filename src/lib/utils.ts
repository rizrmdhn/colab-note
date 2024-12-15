import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";
import {
  SONNER_DEFAULT_TOAST_DURATION,
  SONNER_WARNING_TOAST_DURATION,
} from "./constants";
import {
  differenceInBusinessDays,
  differenceInMinutes,
  format,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const globalSuccessToast = (message: string) => {
  return toast.success("Success", {
    description: message,
    closeButton: true,
    duration: SONNER_DEFAULT_TOAST_DURATION,
  });
};

export const globalLoadingToast = (message: string) => {
  return toast.loading(message, {
    duration: Infinity,
  });
};

export const dismissLoadingToast = (toastId: string | number) => {
  toast.dismiss(toastId); // Use toast ID to dismiss
};

export const globalErrorToast = (message: string, title?: string) => {
  return toast.error(title ?? "Error", {
    description: message,
    closeButton: true,
    duration: SONNER_DEFAULT_TOAST_DURATION,
  });
};

export const globalInfoToast = (message: string) => {
  return toast.info("Info", {
    description: message,
    closeButton: true,
    duration: SONNER_WARNING_TOAST_DURATION,
  });
};

export const globalWarningToast = (message: string) => {
  return toast.warning("Warning", {
    description: message,
    closeButton: true,
    duration: SONNER_WARNING_TOAST_DURATION,
  });
};

export function getDateSeparator(date: Date): string {
  const now = new Date();
  const diffDays = differenceInBusinessDays(now, date);
  const diffMinutes = differenceInMinutes(now, date);

  if (diffMinutes < 60) return "Just now";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return format(date, "d MMMM yyyy HH:mm");
}
