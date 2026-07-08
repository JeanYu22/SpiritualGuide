import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpiritualGuide — a life-transit oracle",
  description:
    "An AI oracle blending I-Ching, Chinese metaphysics, Vedic reading and numerology with a systematic life-cycle map — supportive, mindful guidance for planning around the critical transits of your life.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
