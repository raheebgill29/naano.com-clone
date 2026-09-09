import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppToaster } from "@/components/ui/toaster";
import { UrlFlashToasts } from "@/components/ui/url-flash-toasts";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Naano — B2B LinkedIn Creator Marketplace",
  description:
    "Discover LinkedIn creators, launch campaigns, and track collaboration results.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page font-sans text-ink">
        {children}
        <AppToaster />
        <UrlFlashToasts />
      </body>
    </html>
  );
}
