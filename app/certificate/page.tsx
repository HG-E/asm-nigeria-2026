import type { Metadata } from "next"

import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { CertificateForm } from "@/components/certificate/certificate-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Download Your Certificate | ASM Nigeria 2026",
  description: "Download your Certificate of Participation, Presentation, Workshop Participation, or Volunteer Service for the Maiden American Society for Microbiology Nigeria Conference.",
  alternates: { canonical: "/certificate" },
  robots: { index: false, follow: true },
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found:
    "We couldn't find a match for that reference number and email. Double-check both and try again.",
  not_verified:
    "Your registration payment hasn't been verified yet, so a certificate isn't available. Contact the admin if you believe this is a mistake.",
  payment_pending:
    "Your registration payment is still under review. This usually takes 1-2 days — check back soon, or reach out to the secretariat below if it's been longer.",
  payment_rejected:
    "Your registration payment was rejected, so a certificate isn't available yet.",
  not_attended:
    "Certificates are issued after the conference, once attendance has been confirmed. If you attended and this seems wrong, contact the admin.",
  not_accepted:
    "This abstract doesn't have a final accepted decision on record, so a presentation certificate isn't available yet.",
  format_pending:
    "Your abstract was accepted, but whether it's an oral or poster presentation hasn't been finalized yet. Check back once that's confirmed, or contact the admin.",
  no_workshop:
    "We couldn't find a workshop add-on on this registration. Workshop certificates are only available to participants who registered for the Pre & Post-Conference Hands-On Workshop.",
  workshop_only:
    "This reference number registered for the Pre & Post-Conference Hands-On Workshop only, not the main conference, so a Participation certificate isn't available. Switch to the Workshop tab above to download your certificate.",
  volunteer_only:
    "This reference number registered as a conference volunteer, not a main-conference participant, so a Participation certificate isn't available. Switch to the Volunteer tab above to download your certificate.",
  not_volunteer:
    "We couldn't find a volunteer registration for that reference number and email. Volunteer certificates are only available to registered conference volunteers.",
  fee_not_verified:
    "Your abstract processing fee hasn't been verified yet, so a presentation certificate isn't available. Contact the admin to resolve this.",
  paused:
    "Certificate of Presentation downloads are temporarily paused while we finalize some changes. Please check back soon.",
}

export default async function CertificatePage(props: PageProps<"/certificate">) {
  const searchParams = await props.searchParams
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : null
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.") : null
  const rejectionReason = typeof searchParams.reason === "string" ? searchParams.reason : null
  const defaultType =
    searchParams.type === "presentation"
      ? "presentation"
      : searchParams.type === "workshop"
        ? "workshop"
        : searchParams.type === "volunteer"
          ? "volunteer"
          : "participation"
  const previewToken = typeof searchParams.preview === "string" ? searchParams.preview : ""

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
            Certificate of Participation, Presentation, Workshop Participation, or Volunteer Service for the
            Maiden American Society for Microbiology Nigeria Conference. Enter the reference number and email you
            used to register or submit.
          </p>
        </div>

        <div className="space-y-4 px-6 pt-4 pb-8">
          {errorMessage && (
            <Alert
              variant={errorCode === "payment_pending" ? "default" : "destructive"}
              className={
                errorCode === "payment_pending"
                  ? "border-[#f5a800]/30 bg-[#fffaf0]"
                  : "border-[#cc2229]/30 bg-[#fdf1f1]"
              }
            >
              <AlertDescription className={errorCode === "payment_pending" ? "text-[#8a5a00]" : "text-[#9e1a1f]"}>
                <p>{errorMessage}</p>
                {errorCode === "payment_rejected" && rejectionReason && (
                  <p className="mt-2">
                    <span className="font-medium">Reason given: </span>
                    {rejectionReason}
                  </p>
                )}
                {errorCode === "payment_rejected" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/register-conference" className={buttonVariants({ size: "sm" })}>
                      Submit a new registration
                    </Link>
                    <Link href="/#contacts" className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Contact the secretariat
                    </Link>
                  </div>
                )}
                {errorCode === "payment_pending" && (
                  <div className="mt-3">
                    <Link href="/#contacts" className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Contact the secretariat
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          <CertificateForm defaultType={defaultType} previewToken={previewToken} />
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
