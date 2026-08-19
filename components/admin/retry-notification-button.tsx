"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { retryNotificationAction } from "@/app/admin/notifications/actions"
import { Button } from "@/components/ui/button"

export function RetryNotificationButton({ notificationId }: { notificationId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRetry() {
    startTransition(async () => {
      const result = await retryNotificationAction(notificationId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Retry attempted")
      router.refresh()
    })
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={isPending}>
      {isPending ? "Retrying..." : "Retry"}
    </Button>
  )
}
