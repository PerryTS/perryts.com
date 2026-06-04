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
    default: "Perry — TypeScript → Native",
    template: "%s — Perry",
  },
  description:
    "Perry compiles TypeScript directly to native executables. No Node.js, no Electron, no runtime. Native GUI and CLI apps on macOS, iOS, Android, Linux, and Windows.",
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
    title: "Perry — TypeScript → Native",
    description:
      "Compile TypeScript to native executables. 10 platforms, 25+ UI widgets, 0 ms startup.",
    url: "https://perryts.com",
    siteName: "Perry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perry — TypeScript → Native",
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
