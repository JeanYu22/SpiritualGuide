import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
