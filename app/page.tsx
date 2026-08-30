import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"
import { ConferenceEventJsonLd, FaqJsonLd } from "@/components/structured-data"

export const metadata: Metadata = {
  title: "ASM Nigeria Conference 2026 | One Health. One Future. One Scientific Community.",
  description:
    "The Maiden American Society for Microbiology Nigeria Conference — a national platform for scientific exchange, collaboration and innovation in microbiology. 22–25 November 2026, Abuja, Nigeria. Hybrid.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Maiden American Society for Microbiology Nigeria Conference 2026 | Abuja, Nigeria",
    description:
      "One Health. One Future. One Scientific Community. 22–25 November 2026 · Abuja, Nigeria · Hybrid Conference. Register & submit your abstract today.",
    type: "website",
    url: "https://www.asmnigeriaconference.com.ng",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maiden American Society for Microbiology Nigeria Conference 2026",
    description: "One Health. One Future. One Scientific Community. 22–25 Nov 2026, Abuja. Hybrid.",
    images: ["/brand/og-image.png"],
  },
}

export default function Home() {
  return (
    <>
      <ConferenceEventJsonLd />
      <FaqJsonLd />
      <LandingPage />
    </>
  )
}
