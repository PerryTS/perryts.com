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
    "Perry is a TypeScript to native compiler: standalone binaries with no Node.js runtime. 2–5 MB executables for macOS, Linux, Windows, iOS, and Android.",
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
  openGraph: {
    title: "Perry — Compile TypeScript to Native Executables",
    description:
      "Compile TypeScript to native executables. 10 platforms, 25+ UI widgets, 0 ms startup.",
    url: "https://perryts.com",
    siteName: "Perry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perry — Compile TypeScript to Native Executables",
    description:
      "Compile TypeScript to native executables. 10 platforms, 25+ UI widgets, 0 ms startup.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${rubik.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
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
