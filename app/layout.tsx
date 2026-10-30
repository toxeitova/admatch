import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AnalyticsInit } from "@/components/AnalyticsInit";
import { copy } from "@/lib/copy.ru";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: copy.meta.title,
  description: copy.meta.description,
  openGraph: { title: copy.meta.title, description: copy.meta.description, locale: "ru_RU", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF8F6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <AnalyticsInit />
        {children}
      </body>
    </html>
  );
}
