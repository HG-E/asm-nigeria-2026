"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { ActionResult } from "@/app/author/submissions/[id]/actions"

type Author = {
  first_name: string
  last_name: string
  institution: string | null
  country: string | null
  is_corresponding: boolean
}

export function Step6Review({
  title,
  subthemeName,
  keywords,
  presentationPreference,
  authors,
  abstractText,
  wordCount,
  declarations,
  documentFileName,
  paymentSummary,
  backHref,
  onSubmit,
}: {
  title: string
  subthemeName: string
  keywords: string[]
  presentationPreference: string
  authors: Author[]
  abstractText: string
  wordCount: number
  declarations: {
    noConflictOfInterest: boolean
    ethicalApprovalObtained: boolean
    fundingDeclaration: string
    originalityConfirmed: boolean
  }
  documentFileName: string
  paymentSummary: string
  backHref: string
  onSubmit: () => Promise<ActionResult>
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await onSubmit()
      if ("error" in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Please carefully review your submission before submitting. Once submitted, it
          will enter the conference review process.
        </AlertDescription>
      </Alert>

      <div className="space-y-1 text-sm">
        <h3 className="font-medium">{title}</h3>
        <p className="text-muted-foreground">
          {subthemeName} &middot; {presentationPreference}
        </p>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {keywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-2 text-sm">
        <h3 className="font-medium">Authors</h3>
        <ol className="list-inside list-decimal space-y-1">
          {authors.map((a, i) => (
            <li key={i}>
              {a.first_name} {a.last_name}
              {a.is_corresponding && (
                <span className="text-muted-foreground"> (Corresponding Author)</span>
              )}
              {a.institution && <span className="text-muted-foreground"> — {a.institution}</span>}
            </li>
          ))}
        </ol>
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <h3 className="font-medium">Abstract ({wordCount} words)</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">{abstractText}</p>
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <h3 className="font-medium">Declarations</h3>
        <p>✓ No conflict of interest: {declarations.noConflictOfInterest ? "Confirmed" : "—"}</p>
        <p>✓ Ethical approval: {declarations.ethicalApprovalObtained ? "Confirmed" : "—"}</p>
        <p>✓ Funding/support: {declarations.fundingDeclaration}</p>
        <p>✓ Originality: {declarations.originalityConfirmed ? "Confirmed" : "—"}</p>
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <h3 className="font-medium">Document</h3>
        <p className="text-muted-foreground">{documentFileName}</p>
      </div>

      <Separator />

      <div className="space-y-1 text-sm">
        <h3 className="font-medium">Payment</h3>
        <p className="text-muted-foreground">{paymentSummary}</p>
      </div>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
          Back
        </Link>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Submitting..." : "Submit Abstract"}
        </Button>
      </div>
    </div>
  )
}
