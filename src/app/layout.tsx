import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { buildMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = buildMetadata();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <meta name="theme-color" content="#0d0f10" />
        <JsonLd />
      </head>
      <body className="m-0 min-h-screen bg-[#0d0f10] text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
