"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { rejectCoauthorFeeAction, verifyCoauthorFeeAction } from "@/app/admin/coauthor-fees/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type FeeStatus = "pending" | "verified" | "rejected"

function statusVariant(status: FeeStatus): "gold" | "secondary" | "destructive" {
  if (status === "verified") return "gold"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export function CoauthorFeeVerificationPanel({
  feeId,
  status,
  receiptUrl,
  receiptFileName,
  rejectionReason,
}: {
  feeId: string
  status: FeeStatus
  receiptUrl: string | null
  receiptFileName: string | null
  rejectionReason: string | null
}) {
  const router = useRouter()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setError(null)
    setIsSubmitting(true)
    const result = await verifyCoauthorFeeAction(feeId)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Fee verified")
    router.refresh()
  }

  async function handleReject() {
    setError(null)
    setIsSubmitting(true)
    const result = await rejectCoauthorFeeAction(feeId, reason)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Fee marked rejected")
    setShowReject(false)
    router.refresh()
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant(status)}>{status}</Badge>
        {receiptUrl ? (
          <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
            View receipt {receiptFileName ? `(${receiptFileName})` : ""}
          </a>
        ) : (
          <span className="text-muted-foreground">No receipt on file.</span>
        )}
      </div>

      {status === "rejected" && rejectionReason && (
        <p className="text-muted-foreground">Rejection reason: {rejectionReason}</p>
      )}

      {status !== "verified" && !showReject && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleVerify} disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowReject(true)} disabled={isSubmitting}>
            Reject
          </Button>
        </div>
      )}

      {status === "verified" && (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={isSubmitting}>
          Reject
        </Button>
      )}

      {showReject && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason (e.g. amount doesn't match, unreadable receipt)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={handleReject} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Confirm Reject"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReject(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
