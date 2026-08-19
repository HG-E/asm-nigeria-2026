import type { Metadata } from "next"

import { LandingPage } from "@/components/marketing/landing-page"

export const metadata: Metadata = {
  title: "ASM Nigeria Conference 2026 | One Health. One Future. One Scientific Community.",
  description:
    "The First ASM Nigeria Conference — a national platform for scientific exchange, collaboration and innovation in microbiology. 22–25 November 2026, Abuja, Nigeria. Hybrid.",
  openGraph: {
    title: "First ASM Nigeria Conference 2026 | Abuja, Nigeria",
    description:
      "One Health. One Future. One Scientific Community. 22–25 November 2026 · Abuja, Nigeria · Hybrid Conference. Register & submit your abstract today.",
    type: "website",
    url: "https://abstract-management-system.vercel.app",
    images: ["/brand/asm-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "First ASM Nigeria Conference 2026",
    description: "One Health. One Future. One Scientific Community. 22–25 Nov 2026, Abuja. Hybrid.",
  },
}

export default function Home() {
  return <LandingPage />
}
