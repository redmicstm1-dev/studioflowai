
import type { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-slate-300 border-white/10",
  primary: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  danger: "bg-red-500/15 text-red-300 border-red-500/20",
  info: "bg-blue-500/15 text-blue-300 border-blue-500/20",
};

const dots: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  primary: "bg-violet-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
};

export default function Badge({
  children,
  variant = "default",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-medium leading-none",
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[variant]}`} />
      )}
      {children}
    </span>
  );
}