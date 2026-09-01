import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { InstallPrompt } from "@/components/install-prompt";
import { OfflineBanner } from "@/components/offline-banner";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import { OrganizationJsonLd } from "@/components/structured-data";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.asmnigeriaconference.com.ng"),
  title: "ASM Nigeria 2026 — Abstract Management System",
  description: "Conference abstract submission, review, and decision management for ASM Nigeria 2026.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASM Nigeria 2026",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "ASM Nigeria Conference 2026",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/og-image.png"],
  },
  verification: {
    google: "obTSYIGdUGbFeQVSU_9YzivoCDwWUE6UfSQM0IOWLdc",
  },
};

export const viewport: Viewport = {
  themeColor: "#003087",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* The full dark-mode token set in globals.css (.dark { ... }) has
            never had anything to actually apply the "dark" class -- this
            is that switch, following the OS/browser preference. Runs
            before paint (beforeInteractive) so there's no flash of the
            wrong theme, and only touches documentElement.classList, so it
            can't cause a hydration mismatch. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}`}
        </Script>
        <OrganizationJsonLd />
        <RegisterServiceWorker />
        <OfflineBanner />
        <InstallPrompt />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
