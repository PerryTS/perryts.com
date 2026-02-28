import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 100px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Warm ambient glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
          }}
        />
        {/* Cool ambient glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -60,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Perry pixel bird — reproduced as inline rects */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 80 76"
          width="120"
          height="114"
          style={{ marginBottom: 40 }}
        >
          <rect x="48" y="12" width="7" height="7" rx="1.2" fill="#fbbf24" />
          <rect x="55" y="12" width="7" height="7" rx="1.2" fill="#f59e0b" />
          <rect x="48" y="19" width="7" height="7" rx="1.2" fill="#f97316" />
          <rect x="55" y="19" width="7" height="7" rx="1.2" fill="#fb923c" />
          <rect x="56" y="13" width="4" height="4" rx="1" fill="#ffffff" />
          <rect x="62" y="16" width="7" height="5" rx="1.2" fill="#fde68a" opacity="0.9" />
          <rect x="69" y="18" width="5" height="3" rx="1" fill="#fef3c7" opacity="0.7" />
          <rect x="34" y="26" width="7" height="7" rx="1.2" fill="#f97316" />
          <rect x="41" y="26" width="7" height="7" rx="1.2" fill="#ef4444" />
          <rect x="48" y="26" width="7" height="7" rx="1.2" fill="#e879f9" />
          <rect x="55" y="26" width="7" height="7" rx="1.2" fill="#8b5cf6" />
          <rect x="34" y="33" width="7" height="7" rx="1.2" fill="#a855f7" />
          <rect x="41" y="33" width="7" height="7" rx="1.2" fill="#7c3aed" />
          <rect x="48" y="33" width="7" height="7" rx="1.2" fill="#6366f1" />
          <rect x="55" y="33" width="7" height="7" rx="1.2" fill="#818cf8" />
          <rect x="41" y="40" width="7" height="7" rx="1.2" fill="#3b82f6" />
          <rect x="48" y="40" width="7" height="7" rx="1.2" fill="#60a5fa" />
          <rect x="20" y="19" width="7" height="7" rx="1.2" fill="#fbbf24" opacity="0.7" />
          <rect x="27" y="19" width="7" height="7" rx="1.2" fill="#f59e0b" opacity="0.8" />
          <rect x="13" y="26" width="7" height="7" rx="1.2" fill="#fcd34d" opacity="0.5" />
          <rect x="20" y="26" width="7" height="7" rx="1.2" fill="#fbbf24" opacity="0.7" />
          <rect x="27" y="26" width="7" height="7" rx="1.2" fill="#f97316" opacity="0.8" />
          <rect x="6" y="33" width="7" height="7" rx="1.2" fill="#fcd34d" opacity="0.3" />
          <rect x="13" y="33" width="7" height="7" rx="1.2" fill="#fbbf24" opacity="0.5" />
          <rect x="27" y="47" width="7" height="7" rx="1.2" fill="#60a5fa" opacity="0.5" />
          <rect x="20" y="54" width="7" height="7" rx="1.2" fill="#93c5fd" opacity="0.4" />
          <rect x="13" y="61" width="7" height="7" rx="1.2" fill="#bfdbfe" opacity="0.3" />
          <rect x="34" y="47" width="7" height="7" rx="1.2" fill="#3b82f6" opacity="0.6" />
          <rect x="27" y="54" width="7" height="7" rx="1.2" fill="#60a5fa" opacity="0.4" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: "-2px",
            background: "linear-gradient(90deg, #fbbf24 0%, #a855f7 50%, #3b82f6 100%)",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Perry
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#e0e7ff",
            marginBottom: 32,
            letterSpacing: "-0.5px",
          }}
        >
          TypeScript → Native
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 22,
            color: "#6b7280",
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Compile TypeScript to native executables. 6 platforms, 20+ UI widgets, 0 ms startup.
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 100,
            fontSize: 20,
            color: "#374151",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          perryts.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
