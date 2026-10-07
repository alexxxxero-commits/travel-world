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
  metadataBase: new URL("https://theuniverseofmine.com"),
  title: "The World Of Mine — Personal Travel Journal",
  description:
    "A personal space for places, people, and memories around the world.",
  icons: {
    icon: "/globe-icon.png",
  },
  openGraph: {
    title: "The World Of Mine — Personal Travel Journal",
    description:
      "A personal space for places, people, and memories around the world.",
    siteName: "The World Of Mine",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The World Of Mine — Personal Travel Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The World Of Mine — Personal Travel Journal",
    description:
      "A personal space for places, people, and memories around the world.",
    images: ["/og-image.png"],
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
