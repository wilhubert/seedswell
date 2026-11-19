import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seedswell",
  description: "A public countdown board for people building software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Mono:wght@400..700&family=Rethink+Sans:wght@400..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        {children}
        {/* Vercel Web Analytics: page views here, custom events via
            track() from client components (see JoinSwellButton). */}
        <Analytics />
      </body>
    </html>
  );
}
