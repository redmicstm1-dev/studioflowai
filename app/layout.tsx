import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudioFlow — Your creative workshop",
  description: "Turn ideas into organized creative productions: stories, scenes, shots, voices, and assets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
