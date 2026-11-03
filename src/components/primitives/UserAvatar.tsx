import { cn } from "../../utils/cn";

interface Props {
  firstName: string;
  lastName?: string | null;
  size?: "xs" | "sm";
  className?: string;
}

/** Initials in a gray circle (Lightning's `user_avatar`). */
export default function UserAvatar({ firstName, lastName, size = "xs", className }: Props) {
  const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : "")).toUpperCase();
  return (
    <div
      data-ui="user-avatar"
      className={cn(
        "rounded-full bg-sunken flex items-center justify-center font-semibold text-muted",
        // eslint-disable-next-line no-restricted-syntax -- below text-xs, the smallest step on the scale
        size === "xs" ? "h-5 w-5 text-[10px]" : "h-8 w-8 text-sm",
        className
      )}
    >
      {initials}
    </div>
  );
}
