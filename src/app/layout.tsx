import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";

import {
  GoogleTagManagerNoscript,
  GoogleTagManagerScript,
} from "@/components/GoogleTagManager";
import { SanityLive } from "@/sanity/lib/live";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title:
    "Home - Mark Urquhart - Girl Dad / Solutions Architect / Developer and more",
  description:
    "Hey there, thanks for stopping by. I am a: Girl Dad. Solutions Architect. Self-taught Developer, Designer, and Photographer. Syracuse University alumnus. Boston sports fan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="antialiased">
        <GoogleTagManagerNoscript />
        {children}
        <GoogleTagManagerScript />
        <SanityLive />
      </body>
    </html>
  );
}
