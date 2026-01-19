import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Perry - Compile TypeScript to Native Executables",
  description:
    "Perry is a native TypeScript compiler written in Rust that compiles TypeScript directly to standalone executables. No runtime required.",
  keywords: [
    "TypeScript",
    "compiler",
    "native",
    "Rust",
    "executable",
    "AOT",
    "performance",
  ],
  authors: [{ name: "Perry Team" }],
  openGraph: {
    title: "Perry - Compile TypeScript to Native Executables",
    description:
      "Compile TypeScript directly to native machine code. No runtime, fast startup, small binaries.",
    url: "https://perryts.com",
    siteName: "Perry",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perry - Compile TypeScript to Native Executables",
    description:
      "Compile TypeScript directly to native machine code. No runtime, fast startup, small binaries.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
