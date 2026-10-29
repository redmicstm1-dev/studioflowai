
import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const siteName = "StudioFlow";

const siteDescription =
  "Plan stories, write scripts, organize shots, maintain creative continuity, and manage production assets in one creative workspace.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "StudioFlow — Creative Production Workspace",
    template: "%s | StudioFlow",
  },

  description: siteDescription,

  applicationName: siteName,

  category: "technology",

  keywords: [
    "StudioFlow",
    "creative production workspace",
    "film production software",
    "screenwriting software",
    "story development software",
    "shot planning",
    "film pre-production",
    "film continuity management",
    "creative project management",
    "production asset management",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: "StudioFlow — Creative Production Workspace",
    description: siteDescription,
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "StudioFlow — Creative Production Workspace",
    description: siteDescription,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d",
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