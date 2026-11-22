import type { Metadata } from "next"

import { SchedulePage } from "@/components/marketing/schedule-page"

export const metadata: Metadata = {
  title: "Schedule | ASM Nigeria Conference 2026",
  description:
    "The full oral and poster presentation schedule for ASM Nigeria 2026, the Maiden American Society for Microbiology Nigeria Conference, 22-25 November in Abuja. Downloadable as a PDF.",
  alternates: { canonical: "/schedule" },
  openGraph: {
    title: "Schedule | ASM Nigeria Conference 2026",
    description: "The full oral and poster presentation schedule for ASM Nigeria 2026.",
    type: "website",
    url: "https://www.asmnigeriaconference.com.ng/schedule",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule | ASM Nigeria Conference 2026",
    description: "The full oral and poster presentation schedule for ASM Nigeria 2026.",
    images: ["/brand/og-image.png"],
  },
}

export default function Schedule() {
  return <SchedulePage />
}
