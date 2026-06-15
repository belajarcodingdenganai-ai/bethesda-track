import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Parent Portal Rumah Bethesda";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  const logoUrl = new URL(
    "/brand/rumah-bethesda-logo.png",
    process.env.NEXT_PUBLIC_APP_URL || "https://rumahbethesda.com",
  ).toString();

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8fafc",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#ffffff",
            border: "1px solid #dbeafe",
            borderRadius: 36,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.10)",
            display: "flex",
            gap: 34,
            padding: "54px 64px",
          }}
        >
          <img
            alt="Rumah Bethesda"
            height="128"
            src={logoUrl}
            style={{
              borderRadius: 28,
            }}
            width="128"
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#4f46e5",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Parent Portal
            </div>
            <div
              style={{
                color: "#0f172a",
                fontSize: 62,
                fontWeight: 900,
                lineHeight: 1.05,
                marginTop: 12,
              }}
            >
              Rumah Bethesda
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 29,
                fontWeight: 600,
                marginTop: 18,
              }}
            >
              Kehadiran dan sesi terapi anak
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
