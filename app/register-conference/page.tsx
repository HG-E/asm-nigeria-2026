import Link from "next/link"

import { RegistrationForm } from "@/components/registration/registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// This page has no per-request data, so Next prerenders it fully static by
// default -- which on Vercel means the CDN can serve a cached copy of it
// for ANY request to this path, POST included. The registration form's
// Server Action posts to this same URL, so a cached static response was
// being served back for that POST instead of the action ever running:
// the client never gets a real action result and sits on "Submitting..."
// forever. force-dynamic keeps this route off the static/CDN cache path
// entirely so the action POST always reaches the real server.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Register for ASM Nigeria 2026",
  description: "Register to attend the Maiden American Society for Microbiology Nigeria Conference — 22-25 November 2026, Abuja, Nigeria. Hybrid conference.",
  alternates: { canonical: "/register-conference" },
}

export default async function RegisterConferencePage(props: PageProps<"/register-conference">) {
  const searchParams = await props.searchParams
  const committeeParam = typeof searchParams.committee === "string" ? searchParams.committee : ""
  // Compared server-side only -- the secret itself never reaches client
  // JS unless the correct one was already supplied in the URL, and the
  // submit action independently re-checks it, so this page-level check is
  // just what decides whether to show the free category in the UI.
  const expectedToken = process.env.COMMITTEE_REGISTRATION_TOKEN
  const isCommitteeLink = Boolean(expectedToken) && committeeParam === expectedToken

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Register for the conference</CardTitle>
          <CardDescription>
            This registers you to attend ASM Nigeria 2026 — separate from submitting an
            abstract, and it does not require an account or login. See the{" "}
            <Link href="/#registration" className="underline underline-offset-4">registration &amp; fees</Link> and{" "}
            <Link href="/#payment" className="underline underline-offset-4">payment</Link> sections on the homepage for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm isCommitteeLink={isCommitteeLink} committeeToken={isCommitteeLink ? committeeParam : ""} />
          <p className="text-muted-foreground mt-6 text-center text-sm">
            <Link href="/" className="underline underline-offset-4">
              ← Back to homepage
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
