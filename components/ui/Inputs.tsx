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

const Inputs = forwardRef<HTMLInputElement, InputProps>(
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
            className="mb-2 block text-sm font-medium text-[#d4cfc5]"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#88847a]">
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
              "min-h-11 w-full rounded-xl bg-[#111110] py-3 text-sm text-[#f5f2eb]",
              "outline-none ring-0 border border-transparent shadow-none transition duration-200",
              "placeholder:text-[#6a665e]",
              "focus:outline-none focus:ring-2 focus:ring-[#f08a4b]/30 focus:border-[#f08a4b]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                : "border-transparent hover:border-[#2b2a27]",
              leftIcon ? "pl-11" : "pl-4",
              rightElement ? "pr-11" : "pr-4",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#88847a]">
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
          <p id={`${inputId}-hint`} className="mt-2 text-xs text-[#88847a]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Inputs.displayName = "Inputs";

export default Inputs;
