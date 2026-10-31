
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-900/20",
  secondary:
    "bg-white/10 text-white hover:bg-white/15 border border-white/10",
  outline:
    "border border-white/15 bg-transparent text-slate-200 hover:bg-white/10",
  ghost:
    "bg-transparent text-slate-300 hover:bg-white/10 hover:text-white",
  danger:
    "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className = "",
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl",
          "font-semibold transition duration-200",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-violet-500 focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[#080b16]",
          "disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && <Loader2 size={17} className="animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;