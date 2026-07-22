import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Bump when replacing brand icons so browsers drop stale orange/old favicons. */
const ICON_V = "20260722";

export const metadata: Metadata = {
  title: "OpsPick",
  description: "OpsPick – organize your work with ease",
  icons: {
    icon: [
      { url: `/favicon.ico?v=${ICON_V}`, sizes: "any" },
      { url: `/favicon-16.png?v=${ICON_V}`, sizes: "16x16", type: "image/png" },
      { url: `/favicon-32.png?v=${ICON_V}`, sizes: "32x32", type: "image/png" },
      { url: `/favicon.png?v=${ICON_V}`, sizes: "32x32", type: "image/png" },
      { url: `/icon-192.png?v=${ICON_V}`, sizes: "192x192", type: "image/png" },
      { url: `/icon-512.png?v=${ICON_V}`, sizes: "512x512", type: "image/png" },
    ],
    shortcut: `/favicon.ico?v=${ICON_V}`,
    apple: [{ url: `/apple-touch-icon.png?v=${ICON_V}`, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "OpsPick",
    description: "OpsPick – organize your work with ease",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "OpsPick" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsPick",
    description: "OpsPick – organize your work with ease",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
