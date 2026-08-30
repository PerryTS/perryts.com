import type { Metadata } from "next";
import Script from "next/script";
import { Rubik, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://perryts.com"),
  title: {
    default:
      "Perry — Compile TypeScript to Native Executables | TypeScript Native Compiler",
    template: "%s — Perry",
  },
  description:
    "Perry compiles TypeScript ahead of time to native executables. Native builds need no external Node.js installation or JavaScript engine; Perry's runtime and GC are statically linked.",
  keywords: [
    "TypeScript",
    "compiler",
    "native",
    "Rust",
    "executable",
    "AOT",
    "performance",
    "cross-platform",
    "native UI",
  ],
  authors: [{ name: "Perry" }],
  // No og/twitter title/description here: pages must inherit their own
  // resolved <title>/description as social meta, not the homepage's.
  openGraph: {
    siteName: "Perry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${rubik.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pa.skelpo.com/js/pa-RM9JdedWZTuKvQnKJaGmY.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
