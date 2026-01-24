import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Suspense } from 'react';
import { PixelTracker } from '@/components/PixelTracker';

// ... (existing imports)

export const metadata: Metadata = {
  title: "AdsPilot - Shopee Ads Automation Platform",
  description: "Automate your Shopee Ads to maximize ROI and save time. The smartest way to manage your e-commerce campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <PixelTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
