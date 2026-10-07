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

export const metadata: Metadata = {
  title: "The World Of Mine — Personal Travel Journal",
  description:
    "A personal space for places, people, and memories around the world.",
  openGraph: {
    title: "The World Of Mine — Personal Travel Journal",
    description:
      "A personal space for places, people, and memories around the world.",
    siteName: "The World Of Mine",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The World Of Mine — Personal Travel Journal",
    description:
      "A personal space for places, people, and memories around the world.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
