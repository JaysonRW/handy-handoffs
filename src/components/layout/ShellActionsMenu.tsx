import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

export type ShellActionItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  node?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  labelOnly?: boolean;
};

export function ShellActionsMenu({
  children,
  items,
  align = "end",
  className,
  menuLabel = "Actions",
}: {
  children?: React.ReactNode;
  items?: ShellActionItem[];
  align?: "start" | "center" | "end";
  className?: string;
  menuLabel?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <div className="hidden sm:flex items-center gap-2 shrink-0">{children}</div>

      {items && items.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={cn("sm:hidden shrink-0")}
              aria-label={menuLabel}
              title={menuLabel}
            >
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="w-[220px]">
            <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
            {items.map((it) => {
              if (it.node !== undefined) {
                return (
                  <div key={it.key} className={cn("px-2 py-1", it.separatorBefore && "mt-1 border-t border-border pt-2")}>
                    {it.node}
                  </div>
                );
              }
              const Icon = it.icon;
              const content = (
                <>
                  {Icon ? <Icon className="mr-2 size-4 shrink-0" /> : null}
                  <span className="flex-1 truncate min-w-0">{it.label}</span>
                </>
              );
              const base = cn(
                "cursor-pointer",
                it.danger && "text-[color:var(--color-p1)] focus:text-[color:var(--color-p1)]",
                it.disabled && "pointer-events-none opacity-50",
                it.separatorBefore && "mt-1 border-t border-border pt-2",
              );
              if (it.href) {
                return (
                  <DropdownMenuItem key={it.key} asChild className={base}>
                    <a href={it.href} className="flex items-center w-full">
                      {content}
                    </a>
                  </DropdownMenuItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={it.key}
                  onClick={it.onClick}
                  disabled={it.disabled}
                  className={base}
                >
                  {content}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
