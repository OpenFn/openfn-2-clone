import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins classes; when two set the same thing (p-2 and p-4), the last one wins. */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}
