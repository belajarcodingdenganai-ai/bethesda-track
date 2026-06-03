import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SmartHub",
    short_name: "SmartHub",
    description: "Portal Rumah Bethesda dan Terapi untuk kehadiran guru, siswa, dan sesi terapi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/bethesda-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/bethesda-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
