import { ImageResponse } from "next/og";
import { getCompareItem, getAllCompareSlugs } from "@/lib/compare";
import { getComparisonContent } from "@/lib/compare-content";
import { locales } from "@/i18n/routing";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getAllCompareSlugs().map((slug) => ({ locale, slug }))
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const item = getCompareItem(slug);
  const competitor = item?.competitor ?? "Alternatives";
  const tldr = getComparisonContent(slug)?.tldr ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0f",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Warm ambient glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Header: Perry brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 80 76"
            width="40"
            height="38"
          >
            <rect x="48" y="12" width="7" height="7" rx="1.2" fill="#fbbf24" />
            <rect x="55" y="12" width="7" height="7" rx="1.2" fill="#f59e0b" />
            <rect x="48" y="19" width="7" height="7" rx="1.2" fill="#f97316" />
            <rect x="55" y="19" width="7" height="7" rx="1.2" fill="#fb923c" />
            <rect x="56" y="13" width="4" height="4" rx="1" fill="#ffffff" />
            <rect x="34" y="26" width="7" height="7" rx="1.2" fill="#f97316" />
            <rect x="41" y="26" width="7" height="7" rx="1.2" fill="#ef4444" />
            <rect x="48" y="26" width="7" height="7" rx="1.2" fill="#e879f9" />
            <rect x="55" y="26" width="7" height="7" rx="1.2" fill="#8b5cf6" />
            <rect x="41" y="33" width="7" height="7" rx="1.2" fill="#7c3aed" />
            <rect x="48" y="33" width="7" height="7" rx="1.2" fill="#6366f1" />
            <rect x="41" y="40" width="7" height="7" rx="1.2" fill="#3b82f6" />
            <rect x="48" y="40" width="7" height="7" rx="1.2" fill="#60a5fa" />
          </svg>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              background: "linear-gradient(90deg, #fbbf24, #a855f7, #3b82f6)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Perry Compare
          </span>
        </div>

        {/* Versus title */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Perry
            </span>
            <span style={{ color: "#475569", fontSize: 56, fontWeight: 600 }}>vs</span>
            <span style={{ color: "#f8fafc" }}>{competitor}</span>
          </div>
          {tldr && (
            <div
              style={{
                fontSize: 22,
                color: "#94a3b8",
                lineHeight: 1.5,
                maxWidth: 1000,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                overflow: "hidden",
              }}
            >
              {tldr}
            </div>
          )}
        </div>

        {/* Footer: domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 20,
              padding: "6px 16px",
              fontWeight: 500,
            }}
          >
            comparison
          </div>
          <div style={{ fontSize: 18, color: "#374151", fontWeight: 500 }}>
            perryts.com/compare
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
