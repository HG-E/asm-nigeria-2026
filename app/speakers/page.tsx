import type { Metadata } from "next"

import { SpeakersPage } from "@/components/marketing/speakers-page"

export const metadata: Metadata = {
  title: "Speakers | ASM Nigeria Conference 2026",
  description:
    "Meet the keynote, plenary, and guest speakers of the Maiden American Society for Microbiology Nigeria Conference — full profiles, credentials, and the sub-themes they're speaking on.",
  alternates: { canonical: "/speakers" },
  openGraph: {
    title: "Speakers | ASM Nigeria Conference 2026",
    description:
      "Meet the researchers, administrators, and innovators shaping ASM Nigeria 2026 — full speaker profiles.",
    type: "website",
    url: "https://www.asmnigeriaconference.com.ng/speakers",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Speakers | ASM Nigeria Conference 2026",
    description: "Meet the speakers of ASM Nigeria 2026 — full profiles and credentials.",
    images: ["/brand/og-image.png"],
  },
}

export default function Speakers() {
  return <SpeakersPage />
}
