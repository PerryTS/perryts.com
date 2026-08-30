import { ImageResponse } from "next/og";
import { locales } from "@/i18n/routing";
import { getCoopContent } from "@/lib/coop-content";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const content = getCoopContent(locale);
  const steps = ["TypeScript", "Perry", content.appLibrary, content.worker];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          padding: "72px 76px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 640,
            height: 640,
            borderRadius: "50%",
            top: -260,
            right: -100,
            background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            bottom: -300,
            left: 180,
            background: "radial-gradient(circle, rgba(34,211,238,0.12), transparent 70%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", width: 600, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ width: 9, height: 9, borderRadius: 9, background: "#34d399" }} />
            <div style={{ color: "#6ee7b7", fontSize: 19, fontWeight: 600 }}>{content.adjacent}</div>
          </div>
          <div
            style={{
              fontSize: content.tagline.length > 48 ? 52 : 62,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              color: "#f8fafc",
              marginBottom: 28,
            }}
          >
            {content.tagline}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 23, lineHeight: 1.45, maxWidth: 570 }}>
            {content.metaDescription}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 410, marginLeft: 62, zIndex: 1 }}>
          {steps.map((step, index) => (
            <div key={step} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  border: `1px solid ${index === steps.length - 1 ? "rgba(52,211,153,0.45)" : "rgba(255,255,255,0.13)"}`,
                  background: index === steps.length - 1 ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.035)",
                  borderRadius: 14,
                  padding: "15px 20px",
                  color: index === steps.length - 1 ? "#a7f3d0" : "#cbd5e1",
                  fontSize: 19,
                  fontWeight: 650,
                }}
              >
                {step}
              </div>
              {index < steps.length - 1 && (
                <div style={{ color: "#475569", height: 30, fontSize: 22, display: "flex", alignItems: "center" }}>↓</div>
              )}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "center", height: 24, color: "#059669", fontSize: 18 }}>↓</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              border: "1px dashed rgba(52,211,153,0.4)",
              background: "rgba(16,185,129,0.06)",
              borderRadius: 12,
              padding: "12px 18px",
              color: "#6ee7b7",
              fontSize: 15,
            }}
          >
            {content.sharedProviders}
          </div>
        </div>

        <div style={{ display: "flex", position: "absolute", bottom: 30, right: 52, color: "#334155", fontSize: 16 }}>
          perryts.com/{locale}/coop
        </div>
      </div>
    ),
    size,
  );
}
