"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { retryRegistrationConfirmationAction } from "@/app/admin/registrations/actions"
import { Button } from "@/components/ui/button"

export function RetryRegistrationConfirmationButton({ registrationId }: { registrationId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRetry() {
    startTransition(async () => {
      const result = await retryRegistrationConfirmationAction(registrationId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Confirmation email sent")
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={isPending}>
      {isPending ? "Sending..." : "Retry"}
    </Button>
  )
}
