import Link from "next/link"

import { RegistrationForm } from "@/components/registration/registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Register for ASM Nigeria 2026",
  description: "Register to attend the First ASM Nigeria Conference — 22-25 November 2026, Abuja, Nigeria. Hybrid conference.",
  alternates: { canonical: "/register-conference" },
}

export default function RegisterConferencePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Register for the conference</CardTitle>
          <CardDescription>
            This registers you to attend ASM Nigeria 2026 — separate from submitting an
            abstract. See the <Link href="/#registration" className="underline underline-offset-4">registration &amp; fees</Link> and{" "}
            <Link href="/#payment" className="underline underline-offset-4">payment</Link> sections on the homepage for details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm />
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
