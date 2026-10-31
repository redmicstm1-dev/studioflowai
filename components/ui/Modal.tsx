"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (closeOnOverlayClick && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "studioflow-modal-title" : undefined}
        className={`relative my-auto w-full ${sizes[size]} rounded-2xl border border-[#2b2a27] bg-[#111110] p-6 text-[#f5f2eb] shadow-2xl shadow-black/50 sm:p-7`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-xl p-2 text-[#a5a39c] transition hover:bg-white/[0.04] hover:text-[#f5f2eb] focus:outline-none focus:ring-2 focus:ring-[#f08a4b]/30"
        >
          <X size={19} />
        </button>

        {(title || description) && (
          <header className="mb-6 pr-8">
            {title && (
              <h2
                id="studioflow-modal-title"
                className="text-xl font-semibold tracking-tight text-[#f5f2eb]"
              >
                {title}
              </h2>
            )}

            {description && (
              <p className="mt-2 text-sm leading-6 text-[#a5a39c]">
                {description}
              </p>
            )}
          </header>
        )}

        {children}
      </section>
    </div>,
    document.body
  );
}