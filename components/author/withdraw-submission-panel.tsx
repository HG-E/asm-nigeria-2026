"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { withdrawSubmissionAction } from "@/app/author/submissions/[id]/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function WithdrawSubmissionPanel({ submissionId }: { submissionId: string }) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleWithdraw() {
    setError(null)
    setIsSubmitting(true)
    const result = await withdrawSubmissionAction(submissionId, reason)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Submission withdrawn")
    setShowConfirm(false)
    router.refresh()
  }

  if (!showConfirm) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
        Withdraw submission
      </Button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Withdraw this submission?</p>
      <p className="text-muted-foreground text-sm">
        It will be removed from the review process and can&apos;t be resubmitted. This can&apos;t
        be undone.
      </p>
      <Textarea
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
      />
      <div className="flex gap-2">
        <Button type="button" variant="destructive" size="sm" onClick={handleWithdraw} disabled={isSubmitting}>
          {isSubmitting ? "Withdrawing..." : "Confirm withdrawal"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
