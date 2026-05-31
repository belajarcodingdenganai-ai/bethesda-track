import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Sidebar } from "./sidebar";
import { Toaster } from "./sonner";

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
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-4 pb-4 pt-20 md:p-8 lg:p-12 scroll-smooth">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
