
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightElement,
      className = "",
      containerClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId =
      id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={[
              "min-h-11 w-full rounded-xl border bg-black/20 py-3 text-sm text-white",
              "outline-none transition placeholder:text-slate-600",
              "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                : "border-white/10",
              leftIcon ? "pl-11" : "pl-4",
              rightElement ? "pr-11" : "pr-4",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2">
              {rightElement}
            </span>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-2 text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;