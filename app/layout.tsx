import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "./sonner";
import { AppShell } from "./app-shell";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TherapyOS - Bethesda Special School",
  description: "Modern Therapy Management System",
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
