import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-amber-600",
  "bg-red-600",
  "bg-orange-600",
  "bg-lime-600",
  "bg-green-600",
  "bg-cyan-600",
  "bg-blue-600",
  "bg-violet-600",
  "bg-fuchsia-600",
];

function hashUserId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  userId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-6 text-xs",
  md: "size-7 text-xs",
  lg: "size-10 text-sm",
};

export function UserAvatar({
  userId,
  name,
  size = "md",
  className,
}: UserAvatarProps) {
  const colorClass = AVATAR_COLORS[hashUserId(userId) % AVATAR_COLORS.length];
  const initials = getInitials(name);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-normal",
        sizeClasses[size],
        colorClass,
        className,
      )}
      title={name}
    >
      {initials}
    </span>
  );
}
