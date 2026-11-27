import type { Metadata } from "next"

import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { ResubmitReceiptForm } from "@/components/registration/resubmit-receipt-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { lookupRegistrationForResubmit } from "@/lib/registration-resubmit"

export const metadata: Metadata = {
  title: "Resubmit Your Registration Receipt | ASM Nigeria 2026",
  description: "Fix a rejected conference registration payment by uploading a corrected receipt -- no need to register again from scratch.",
  alternates: { canonical: "/register-conference/resubmit" },
  robots: { index: false, follow: true },
}

export default async function ResubmitReceiptPage(props: PageProps<"/register-conference/resubmit">) {
  const searchParams = await props.searchParams
  const referenceNumber = typeof searchParams.ref === "string" ? searchParams.ref.trim() : ""
  const email = typeof searchParams.email === "string" ? searchParams.email.trim() : ""
  const submitted = searchParams.submitted === "1"

  const registration = referenceNumber && email ? await lookupRegistrationForResubmit(referenceNumber, email) : null

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
          <h1 className="font-heading mt-3 text-2xl font-semibold text-[#0d1b3e]">
            Resubmit your receipt
          </h1>
          <p className="text-muted-foreground text-sm text-balance">
            If your conference registration payment was rejected, fix it here with a corrected receipt -- no need to
            register again from scratch. Your reference number and other details stay exactly as they were.
          </p>
        </div>

        <div className="space-y-4 px-6 pt-4 pb-8">
          {submitted && (
            <Alert className="border-[#187752]/30 bg-[#f1faf5]">
              <AlertDescription className="text-[#0e5a3a]">
                Corrected receipt submitted. It's back in the review queue -- you'll get an email once it's checked,
                usually within a couple of days.
              </AlertDescription>
            </Alert>
          )}

          {!submitted && registration?.ok && registration.paymentStatus === "rejected" && (
            <Alert variant="destructive" className="border-[#cc2229]/30 bg-[#fdf1f1]">
              <AlertDescription className="text-[#9e1a1f]">
                <p>Your previous receipt for {registration.referenceNumber} couldn&apos;t be verified.</p>
                {registration.rejectionReason && (
                  <p className="mt-2">
                    <span className="font-medium">Reason given: </span>
                    {registration.rejectionReason}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!submitted && registration?.ok && registration.paymentStatus === "verified" && (
            <Alert className="border-[#187752]/30 bg-[#f1faf5]">
              <AlertDescription className="space-y-2 text-[#0e5a3a]">
                <p>This registration is already verified -- there&apos;s nothing to resubmit.</p>
                <Link href="/certificate" className={buttonVariants({ size: "sm" })}>
                  Go to certificate download
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {!submitted && registration?.ok && registration.paymentStatus === "pending" && (
            <Alert className="border-[#f5a800]/30 bg-[#fffaf0]">
              <AlertDescription className="text-[#8a5a00]">
                A receipt for this registration is already awaiting review -- no need to resubmit yet. Check back
                soon, or contact the secretariat if it&apos;s been a while.
              </AlertDescription>
            </Alert>
          )}

          {!submitted && referenceNumber && email && !registration?.ok && (
            <Alert variant="destructive" className="border-[#cc2229]/30 bg-[#fdf1f1]">
              <AlertDescription className="text-[#9e1a1f]">
                We couldn&apos;t find a match for that reference number and email. Double-check both below and try
                again.
              </AlertDescription>
            </Alert>
          )}

          {!submitted && (!registration?.ok || registration.paymentStatus === "rejected") && (
            <ResubmitReceiptForm defaultReferenceNumber={referenceNumber} defaultEmail={email} />
          )}
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
