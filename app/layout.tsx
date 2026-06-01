import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "./sonner";
import { AppShell } from "./app-shell";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://bethesda-track.vercel.app"),
  title: {
    default: "Bethesda Track",
    template: "%s | Bethesda Track",
  },
  description: "Portal kehadiran guru, siswa, dan sesi terapi Bethesda Special School.",
  manifest: "/manifest.webmanifest",
  applicationName: "Bethesda Track",
  appleWebApp: {
    capable: true,
    title: "Bethesda Track",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/bethesda-icon.svg",
    shortcut: "/icons/bethesda-icon.svg",
    apple: "/icons/bethesda-icon.svg",
  },
  openGraph: {
    title: "Bethesda Track",
    description: "Portal kehadiran guru, siswa, dan sesi terapi Bethesda Special School.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="antialiased">
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-950`}>
        <Suspense fallback={<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
