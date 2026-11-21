import type { Metadata } from "next"

import { AwardeesPage } from "@/components/marketing/awardees-page"

export const metadata: Metadata = {
  title: "Awardees | ASM Nigeria Conference 2026",
  description:
    "Honorees recognized for outstanding contributions to microbiology and One Health in Nigeria at ASM Nigeria 2026, the Maiden American Society for Microbiology Nigeria Conference.",
  alternates: { canonical: "/awardees" },
  openGraph: {
    title: "Awardees | ASM Nigeria Conference 2026",
    description: "Honorees recognized for outstanding contributions to microbiology and One Health in Nigeria.",
    type: "website",
    url: "https://www.asmnigeriaconference.com.ng/awardees",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Awardees | ASM Nigeria Conference 2026",
    description: "Honorees recognized for outstanding contributions to microbiology and One Health in Nigeria.",
    images: ["/brand/og-image.png"],
  },
}

export default function Awardees() {
  return <AwardeesPage />
}
