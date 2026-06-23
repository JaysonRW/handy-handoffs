import { getUser } from "@/features/users/data";
import { cn } from "@/lib/utils";

export function Avatar({ userId, size = 32, className }: { userId: string | null | undefined; size?: number; className?: string }) {
  const u = getUser(userId ?? undefined);
  if (!u) {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-full border bg-muted text-muted-foreground text-xs font-semibold", className)}
        style={{ width: size, height: size }}
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ring-1 ring-black/20", className)}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, oklch(0.55 0.18 ${u.hue}), oklch(0.42 0.16 ${u.hue}))`,
        fontSize: Math.max(10, size * 0.38),
      }}
      title={u.name}
    >
      {u.initials}
    </span>
  );
}
