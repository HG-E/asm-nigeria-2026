import type { Metadata } from "next"

import { PartnersPage } from "@/components/marketing/partners-page"

export const metadata: Metadata = {
  title: "Our Partners | ASM Nigeria Conference 2026",
  description:
    "The organizations partnering with ASM Nigeria 2026, the Maiden American Society for Microbiology Nigeria Conference, to advance One Health microbiology across Nigeria.",
  alternates: { canonical: "/partners" },
  openGraph: {
    title: "Our Partners | ASM Nigeria Conference 2026",
    description: "The organizations partnering with ASM Nigeria 2026 to advance One Health microbiology across Nigeria.",
    type: "website",
    url: "https://www.asmnigeriaconference.com.ng/partners",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Partners | ASM Nigeria Conference 2026",
    description: "The organizations partnering with ASM Nigeria 2026.",
    images: ["/brand/og-image.png"],
  },
}

export default function Partners() {
  return <PartnersPage />
}
