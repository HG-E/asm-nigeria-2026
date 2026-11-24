import Link from "next/link"

import { RegistrationForm } from "@/components/registration/registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Same reasoning as app/register-conference/page.tsx -- this page shares the
// same Server Action, which needs this route kept off the static/CDN cache
// path so a cached response is never served back in place of a real result.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Register for the Workshop | ASM Nigeria 2026",
  description: "Register for the Pre & Post-Conference Hands-On Workshop at ASM Nigeria 2026, separate from the main conference.",
  alternates: { canonical: "/register-workshop" },
}

export default function RegisterWorkshopPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Register for the workshop</CardTitle>
          <CardDescription>
            This registers you for the Pre &amp; Post-Conference Hands-On Workshop only — for those
            who want to attend the workshop without the main conference, or who already registered
            for the conference and missed adding it. Already registering for the conference?
            Add the workshop directly from the{" "}
            <Link href="/register-conference" className="underline underline-offset-4">
              conference registration form
            </Link>{" "}
            instead, to avoid a duplicate entry. See the{" "}
            <Link href="/schedule" className="underline underline-offset-4">
              workshop schedule
            </Link>{" "}
            and <Link href="/#payment" className="underline underline-offset-4">payment</Link> section
            on the homepage for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm isCommitteeLink={false} committeeToken="" lockedCategory="Workshop Only" />
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
