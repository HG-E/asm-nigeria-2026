import type { Metadata } from "next"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const metadata: Metadata = {
  title: "Download Your Certificate | ASM Nigeria 2026",
  description: "Download your Certificate of Participation for the Maiden ASM Nigeria Conference.",
  alternates: { canonical: "/certificate" },
  robots: { index: false, follow: true },
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found:
    "We couldn't find a registration matching that reference number and email. Double-check both and try again.",
  not_verified:
    "Your registration payment hasn't been verified yet, so a certificate isn't available. Contact the admin if you believe this is a mistake.",
  not_attended:
    "Certificates are issued after the conference, once attendance has been confirmed. If you attended and this seems wrong, contact the admin.",
}

export default async function CertificatePage(props: PageProps<"/certificate">) {
  const searchParams = await props.searchParams
  const errorCode = typeof searchParams.error === "string" ? searchParams.error : null
  const errorMessage = errorCode ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong. Please try again.") : null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Download your certificate</CardTitle>
          <CardDescription>
            Certificate of Participation for the Maiden ASM Nigeria Conference. Enter the reference
            number and email you used to register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <form method="POST" action="/certificate/download" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Registration reference number</Label>
              <Input
                id="referenceNumber"
                name="referenceNumber"
                placeholder="REG-ASM-ABJ-2026-XXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">
              Download certificate
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
