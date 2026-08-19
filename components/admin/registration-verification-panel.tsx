"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { rejectRegistrationAction, verifyRegistrationAction } from "@/app/admin/registrations/actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function RegistrationVerificationPanel({
  registrationId,
  status,
}: {
  registrationId: string
  status: "pending" | "verified" | "rejected"
}) {
  const router = useRouter()
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setError(null)
    setIsSubmitting(true)
    const result = await verifyRegistrationAction(registrationId)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Registration verified")
    router.refresh()
  }

  async function handleReject() {
    setError(null)
    setIsSubmitting(true)
    const result = await rejectRegistrationAction(registrationId, reason)
    setIsSubmitting(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    toast.success("Registration marked rejected — registrant notified")
    setShowReject(false)
    router.refresh()
  }

  if (status === "verified") {
    return null
  }

  return (
    <div className="space-y-2 text-sm">
      {!showReject && (
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={handleVerify} disabled={isSubmitting}>
            {isSubmitting ? "Verifying..." : "Verify"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowReject(true)} disabled={isSubmitting}>
            Reject
          </Button>
        </div>
      )}

      {showReject && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason (shown to the registrant)"
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
