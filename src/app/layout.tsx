import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { DM_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Praxis - Automate Your Technical Brand",
  description: "A smart stateful AI agent that helps engineers and leaders draft, review, and publish high-quality technical posts directly to LinkedIn.",
  openGraph: {
    title: "Praxis - Automate Your Technical Brand",
    description: "A smart stateful AI agent that helps engineers and leaders draft, review, and publish high-quality technical posts directly to LinkedIn.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Praxis - Automate Your Technical Brand",
    description: "A smart stateful AI agent that helps engineers and leaders draft, review, and publish high-quality technical posts directly to LinkedIn.",
  },
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", "font-sans", dmSans.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
