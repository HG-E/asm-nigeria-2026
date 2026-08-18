"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { ConflictDeclarationInput } from "@/lib/validations/review"

type ActionResult = { error: string } | { success: true }

export function ConflictDeclaration({
  onSubmit,
}: {
  assignmentId: string
  onSubmit: (data: ConflictDeclarationInput) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(hasConflict: boolean) {
    setError(null)
    setIsSubmitting(true)
    const result = await onSubmit({ hasConflict, conflictReason: reason })
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conflict of Interest</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Before reviewing, declare whether you have a conflict of interest with this
          submission (e.g. co-authorship, close collaboration, institutional conflict).
        </p>

        {!showReason ? (
          <div className="flex gap-3">
            <Button type="button" onClick={() => submit(false)} disabled={isSubmitting}>
              No Conflict
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReason(true)}
              disabled={isSubmitting}
            >
              Conflict of Interest
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              placeholder="Briefly describe the conflict (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={() => submit(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm Conflict of Interest"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowReason(false)}>
                Back
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
