
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizes = {
  sm: 16,
  md: 24,
  lg: 36,
};

export default function LoadingSpinner({
  size = "md",
  label,
  fullScreen = false,
  className = "",
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        size={sizes[size]}
        className="shrink-0 animate-spin text-violet-400"
        aria-hidden="true"
      />

      {label && <span className="text-sm text-slate-400">{label}</span>}

      {!label && <span className="sr-only">Loading...</span>}
    </div>
  );

  if (!fullScreen) return spinner;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080b16]">
      {spinner}
    </div>
  );
}