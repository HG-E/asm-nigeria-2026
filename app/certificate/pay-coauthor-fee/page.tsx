import type { Metadata } from "next"

import Link from "next/link"

import { BrandMark } from "@/components/layout/brand-mark"
import { CoauthorFeeForm } from "@/components/certificate/coauthor-fee-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { getActiveConference } from "@/lib/conference"
import { COAUTHOR_FEE_NGN, getCoauthorFeeStatus } from "@/lib/presentation-certificate"

export const metadata: Metadata = {
  title: "Co-Author Certificate Fee | ASM Nigeria 2026",
  description: "Pay the one-time co-author certificate fee to unlock your Certificate of Presentation.",
  alternates: { canonical: "/certificate/pay-coauthor-fee" },
  robots: { index: false, follow: true },
}

export default async function PayCoauthorFeePage(props: PageProps<"/certificate/pay-coauthor-fee">) {
  const searchParams = await props.searchParams
  const email = typeof searchParams.email === "string" ? searchParams.email.trim() : ""
  const name = typeof searchParams.name === "string" ? searchParams.name.trim() : ""
  const submitted = searchParams.submitted === "1"

  const conference = await getActiveConference()
  const status = conference && email ? await getCoauthorFeeStatus(conference.id, email, name, false) : "unpaid"

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
            Co-author certificate fee
          </h1>
          <p className="text-muted-foreground text-sm text-balance">
            Co-authors (not the corresponding author) need either a registered, paid conference registration or
            this one-time ₦{COAUTHOR_FEE_NGN.toLocaleString()} fee to download their own Certificate of
            Presentation. If you&apos;ve already registered and paid for the conference under this email, no fee is
            needed — just try downloading again. Otherwise, pay once below and it covers every abstract you&apos;re
            listed on as a co-author.
          </p>
        </div>

        <div className="space-y-4 px-6 pt-4 pb-8">
          {submitted && (
            <Alert className="border-[#187752]/30 bg-[#f1faf5]">
              <AlertDescription className="text-[#0e5a3a]">
                Receipt submitted. Your certificate will be available once this is verified — usually within a
                couple of days. You can safely leave and try downloading again later with the same abstract
                reference number and email.
              </AlertDescription>
            </Alert>
          )}

          {status === "verified" && (
            <Alert className="border-[#187752]/30 bg-[#f1faf5]">
              <AlertDescription className="space-y-2 text-[#0e5a3a]">
                <p>This fee has already been verified for {email}. Download your certificate below.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/certificate?type=presentation" className={buttonVariants({ size: "sm" })}>
                    Go to certificate download
                  </Link>
                  {name && (
                    <Link
                      href={`/certificate/pay-coauthor-fee/receipt?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      Download fee receipt
                    </Link>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === "exempt" && (
            <Alert className="border-[#187752]/30 bg-[#f1faf5]">
              <AlertDescription className="space-y-2 text-[#0e5a3a]">
                <p>
                  Good news — {email} already has a verified conference registration, so no fee is needed. Download
                  your certificate below.
                </p>
                <Link href="/certificate?type=presentation" className={buttonVariants({ size: "sm" })}>
                  Go to certificate download
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {status === "pending" && !submitted && (
            <Alert className="border-[#f5a800]/30 bg-[#fffaf0]">
              <AlertDescription className="text-[#8a5a00]">
                We already have a receipt on file for {email}, awaiting verification. No need to submit again unless
                it was rejected.
              </AlertDescription>
            </Alert>
          )}

          {status === "rejected" && (
            <Alert variant="destructive" className="border-[#cc2229]/30 bg-[#fdf1f1]">
              <AlertDescription className="text-[#9e1a1f]">
                Your previous receipt for {email} couldn&apos;t be verified. Please check the amount and account
                details below and submit a clear copy.
              </AlertDescription>
            </Alert>
          )}

          {(status === "unpaid" || status === "rejected") && (
            <>
              <div className="bg-muted/50 space-y-2 rounded-lg border p-4 text-sm">
                <p className="font-medium">Amount: ₦{COAUTHOR_FEE_NGN.toLocaleString()}</p>
                {conference?.payment_account_details ? (
                  <p className="whitespace-pre-wrap">{conference.payment_account_details}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Payment account details have not been configured yet — contact the Admin.
                  </p>
                )}
              </div>
              <CoauthorFeeForm defaultEmail={email} defaultName={name} />
            </>
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
