import Link from "next/link"

import { RegistrationForm } from "@/components/registration/registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Same reasoning as app/register-conference/page.tsx -- this page shares the
// same Server Action, which needs this route kept off the static/CDN cache
// path so a cached response is never served back in place of a real result.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Volunteer Registration | ASM Nigeria 2026",
  description: "Private volunteer registration link for ASM Nigeria 2026.",
  robots: { index: false, follow: false },
}

export default async function RegisterVolunteerPage(props: PageProps<"/register-volunteer">) {
  const searchParams = await props.searchParams
  const tokenParam = typeof searchParams.token === "string" ? searchParams.token : ""
  // Compared server-side only -- same pattern as the committee link in
  // app/register-conference/page.tsx. The secret never reaches client JS
  // unless the correct one was already supplied in the URL, and the submit
  // action independently re-checks it, so this is just what decides whether
  // to show the form at all.
  const expectedToken = process.env.VOLUNTEER_REGISTRATION_TOKEN
  const isVolunteerLink = Boolean(expectedToken) && tokenParam === expectedToken

  if (!isVolunteerLink) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/30 px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">This link is invalid or has expired</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Volunteer registration is only open through the private link shared directly with you. If you
          believe this is a mistake, contact the Admin.
        </p>
        <Link href="/" className="underline underline-offset-4">
          ← Back to homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Volunteer registration</CardTitle>
          <CardDescription>
            Thank you for volunteering with us at ASM Nigeria 2026. This registers you as a conference
            volunteer, free of charge, and does not require an account or login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm isCommitteeLink={false} committeeToken="" isVolunteerLink volunteerToken={tokenParam} />
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
