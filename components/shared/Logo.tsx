
import Link from "next/link";
import { Film } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linked?: boolean;
  showName?: boolean;
}

export default function Logo({
  size = "md",
  linked = true,
  showName = true,
}: LogoProps) {
  const dimensions = {
    sm: {
      icon: "h-8 w-8",
      iconSize: 17,
      text: "text-lg",
    },
    md: {
      icon: "h-10 w-10",
      iconSize: 21,
      text: "text-xl",
    },
    lg: {
      icon: "h-12 w-12",
      iconSize: 25,
      text: "text-2xl",
    },
  };

  const style = dimensions[size];

  const content = (
    <span className="inline-flex items-center gap-3">
      <span
        className={`flex ${style.icon} items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-900/30`}
      >
        <Film size={style.iconSize} />
      </span>

      {showName && (
        <span className={`${style.text} font-bold tracking-tight text-white`}>
          Studio<span className="text-violet-400">Flow</span>
        </span>
      )}
    </span>
  );

  if (!linked) return content;

  return (
    <Link href="/" aria-label="StudioFlow home">
      {content}
    </Link>
  );
}
