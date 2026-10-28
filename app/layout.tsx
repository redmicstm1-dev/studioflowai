import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "StudioFlow — Creative Production Workspace",
    template: "%s | StudioFlow",
  },

  description:
    "Bring your creative projects to life with StudioFlow. Develop ideas, write scripts, organize scenes and shots, maintain continuity, manage assets, and explore voice production in one workspace.",

  applicationName: "StudioFlow",

  keywords: [
    "creative production workspace",
    "film production software",
    "screenwriting software",
    "AI filmmaking tools",
    "story development",
    "shot planning",
    "film continuity management",
    "voice production",
  ],

  openGraph: {
    type: "website",
    siteName: "StudioFlow",
    title: "StudioFlow — Creative Production Workspace",
    description:
      "Plan stories, develop scripts, organize shots, manage creative assets, and bring productions together in one workspace.",
  },

  twitter: {
    card: "summary_large_image",
    title: "StudioFlow — Creative Production Workspace",
    description:
      "One workspace for creative ideas, stories, shots, continuity, assets, and voice production.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}