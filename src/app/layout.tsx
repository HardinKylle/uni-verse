import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// The phone skin must render in real SF Pro on every device (and in every
// exported PNG), so it is self-hosted rather than left to whatever the viewer
// has installed — a missing local font silently fell back to Times. Latin-only
// woff2 subsets of SF Pro Text; weights below 300 resolve to Light.
const sfPro = localFont({
  variable: "--font-sf-pro",
  display: "block",
  src: [
    { path: "./fonts/sf-pro/SF-Pro-Text-Light.woff2", weight: "300" },
    { path: "./fonts/sf-pro/SF-Pro-Text-Regular.woff2", weight: "400" },
    { path: "./fonts/sf-pro/SF-Pro-Text-Medium.woff2", weight: "500" },
    { path: "./fonts/sf-pro/SF-Pro-Text-Semibold.woff2", weight: "600" },
  ],
});

export const metadata: Metadata = {
  title: "Kathalis",
  description: "Create and export fictional message conversations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${sfPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
