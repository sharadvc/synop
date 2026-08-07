import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synop | Open Source AI YouTube Summarizer",
  description: "Extract high signal from noise. Synop is a 100% free, open-source AI tool that transforms hour-long YouTube videos into actionable, dense, and structured summaries in seconds.",
  keywords: ["youtube summarizer", "AI summary", "open source ai", "video summary", "gemini", "groq", "llama3", "youtube transcript"],
  authors: [{ name: "Synop" }],
  openGraph: {
    title: "Synop | Open Source AI YouTube Summarizer",
    description: "Extract high signal from noise. Synop is a 100% free, open-source AI tool that transforms hour-long YouTube videos into actionable summaries.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synop | Open Source AI YouTube Summarizer",
    description: "Extract high signal from noise. 100% free, open-source AI tool.",
  }
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/context/LanguageContext";
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Optional auth: active only when Clerk keys are configured (e.g. deployed).
  // Localhost / self-hosted runs stay open-source and key-free.
  const clerkActive = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LanguageProvider>
            {clerkActive ? <ClerkProvider>{children}</ClerkProvider> : children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
