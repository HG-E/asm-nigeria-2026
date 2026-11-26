import { redirect } from "next/navigation"
import type { Metadata } from "next"

import { BrandMark } from "@/components/layout/brand-mark"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { lookupPresentationEligibility } from "@/lib/presentation-certificate"

export const metadata: Metadata = {
  title: "Select Your Name | ASM Nigeria 2026",
  description: "Pick your name to download your own Certificate of Presentation.",
  alternates: { canonical: "/certificate/select-author" },
  robots: { index: false, follow: true },
}

export default async function SelectAuthorPage(props: PageProps<"/certificate/select-author">) {
  const searchParams = await props.searchParams
  const referenceNumber = typeof searchParams.referenceNumber === "string" ? searchParams.referenceNumber : ""
  const email = typeof searchParams.email === "string" ? searchParams.email : ""

  if (!referenceNumber || !email) {
    redirect("/certificate?type=presentation&error=not_found")
  }

  const result = await lookupPresentationEligibility(referenceNumber, email)

  if (!result.ok) {
    redirect(`/certificate?type=presentation&error=${result.error}`)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-b from-white to-[#eef2fa] px-4 py-12">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-card shadow-[0_1px_3px_rgba(0,48,135,0.06),0_8px_32px_rgba(0,48,135,0.1)] ring-1 ring-[#003087]/10">
        <div className="flex h-1.5">
          <div className="flex-1 bg-[#cc2229]" />
          <div className="flex-1 bg-[#003087]" />
          <div className="flex-1 bg-[#f5a800]" />
          <div className="flex-1 bg-[#187752]" />
        </div>

        <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-2 text-center">
          <BrandMark height={36} />
          <h1 className="font-heading mt-3 text-2xl font-semibold text-[#0d1b3e]">Which name is yours?</h1>
          <p className="text-muted-foreground text-sm text-balance">
            More than one author on this abstract is listed with this email address. Select your own name to
            download your certificate.
          </p>
        </div>

        <div className="space-y-3 px-6 pt-4 pb-8">
          <Alert className="border-[#003087]/20 bg-[#eef2fa]">
            <AlertDescription className="text-[#0d1b3e]">
              If your name isn&apos;t listed, or more than one entry could be you, the author details on the abstract
              need correcting first. Contact the admin.
            </AlertDescription>
          </Alert>
          {result.candidates.map((candidate) => (
            <form key={candidate.authorOrder} method="POST" action="/certificate/download">
              <input type="hidden" name="type" value="presentation" />
              <input type="hidden" name="referenceNumber" value={referenceNumber} />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="authorOrder" value={candidate.authorOrder} />
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-start border-[#003087]/20 text-[#0d1b3e] hover:bg-[#eef2fa]"
              >
                {candidate.fullName}
              </Button>
            </form>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        One Health · One Future · One Scientific Community
        <br />
        22–25 November 2026 · Abuja, Nigeria
      </p>
    </div>
  )
}
