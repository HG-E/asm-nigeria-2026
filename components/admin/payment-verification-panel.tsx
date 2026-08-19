"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { rejectPaymentAction, verifyPaymentAction } from "@/app/admin/submissions/[id]/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type PaymentStatus = "pending" | "verified" | "rejected"

function statusVariant(status: PaymentStatus): "gold" | "secondary" | "destructive" {
  if (status === "verified") return "gold"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export function PaymentVerificationPanel({
  submissionId,
  status,
  currency,
  receiptUrl,
  receiptFileName,
  rejectionReason,
}: {
  submissionId: string
  status: PaymentStatus
  currency: string | null
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
    const result = await verifyPaymentAction(submissionId)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Payment verified")
    router.refresh()
  }

  async function handleReject() {
    setError(null)
    setIsSubmitting(true)
    const result = await rejectPaymentAction(submissionId, reason)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Payment marked rejected — author notified")
    setShowReject(false)
    router.refresh()
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant(status)}>{status}</Badge>
        {currency && <span className="text-muted-foreground">Paid in {currency}</span>}
      </div>

      {receiptUrl ? (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-4"
        >
          View receipt {receiptFileName ? `(${receiptFileName})` : ""}
        </a>
      ) : (
        <p className="text-muted-foreground">No receipt uploaded yet.</p>
      )}

      {status === "rejected" && rejectionReason && (
        <p className="text-muted-foreground">Rejection reason: {rejectionReason}</p>
      )}

      {receiptUrl && status !== "verified" && !showReject && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleVerify} disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify Payment"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowReject(true)}
            disabled={isSubmitting}
          >
            Reject
          </Button>
        </div>
      )}

      {receiptUrl && status === "verified" && (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowReject(true)} disabled={isSubmitting}>
          Reject
        </Button>
      )}

      {showReject && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason (shown to the author, e.g. amount doesn't match, unreadable receipt)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={isSubmitting}
            >
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
