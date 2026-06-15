import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Parent Portal",
  },
  description: "Akses Parent Portal Rumah Bethesda untuk memantau kehadiran dan sesi terapi.",
  openGraph: {
    title: "Parent Portal",
    description: "Akses Parent Portal Rumah Bethesda untuk memantau kehadiran dan sesi terapi.",
    type: "website",
    images: [
      {
        url: "https://rumahbethesda.com/parent-portal/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Parent Portal Rumah Bethesda",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Parent Portal",
    description: "Akses Parent Portal Rumah Bethesda untuk memantau kehadiran dan sesi terapi.",
    images: ["https://rumahbethesda.com/parent-portal/opengraph-image"],
  },
};

export default function ParentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
