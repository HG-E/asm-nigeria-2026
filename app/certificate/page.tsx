import type { Metadata } from "next"

import { BrandMark } from "@/components/layout/brand-mark"
import { CertificateForm } from "@/components/certificate/certificate-form"
import { Alert, AlertDescription } from "@/components/ui/alert"

export const metadata: Metadata = {
  title: "Download Your Certificate | ASM Nigeria 2026",
  description: "Download your Certificate of Participation or Presentation for the Maiden ASM Nigeria Conference.",
  alternates: { canonical: "/certificate" },
  robots: { index: false, follow: true },
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found:
    "We couldn't find a match for that reference number and email. Double-check both and try again.",
  not_verified:
    "Your registration payment hasn't been verified yet, so a certificate isn't available. Contact the admin if you believe this is a mistake.",
  not_attended:
    "Certificates are issued after the conference, once attendance has been confirmed. If you attended and this seems wrong, contact the admin.",
  not_accepted:
    "This abstract doesn't have a final accepted decision on record, so a presentation certificate isn't available yet.",
  format_pending:
    "Your abstract was accepted, but whether it's an oral or poster presentation hasn't been finalized yet. Check back once that's confirmed, or contact the admin.",
}

export default async function CertificatePage(props: PageProps<"/certificate">) {
  const searchParams = await props.searchParams
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : null
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.") : null
  const defaultType = searchParams.type === "presentation" ? "presentation" : "participation"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gradient-to-b from-white to-[#eef2fa] px-4 py-12">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-card shadow-[0_1px_3px_rgba(0,48,135,0.06),0_8px_32px_rgba(0,48,135,0.1)] ring-1 ring-[#003087]/10">
        {/* Same four-color band that runs across the top of the actual
            certificates -- a small, deliberate echo tying this page to the
            document it hands out. */}
        <div className="flex h-1.5">
          <div className="flex-1 bg-[#cc2229]" />
          <div className="flex-1 bg-[#003087]" />
          <div className="flex-1 bg-[#f5a800]" />
          <div className="flex-1 bg-[#187752]" />
        </div>

        <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-2 text-center">
          <BrandMark height={36} />
          <h1 className="font-heading mt-3 text-2xl font-semibold text-[#0d1b3e]">
            Download your certificate
          </h1>
          <p className="text-muted-foreground text-sm text-balance">
            Certificate of Participation or Presentation for the Maiden ASM Nigeria Conference.
            Enter the reference number and email you used to register or submit.
          </p>
        </div>

        <div className="space-y-4 px-6 pt-4 pb-8">
          {errorMessage && (
            <Alert variant="destructive" className="border-[#cc2229]/30 bg-[#fdf1f1]">
              <AlertDescription className="text-[#9e1a1f]">{errorMessage}</AlertDescription>
            </Alert>
          )}
          <CertificateForm defaultType={defaultType} />
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
