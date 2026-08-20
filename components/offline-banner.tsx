"use client"

import { useOffline } from "next/offline"

export function OfflineBanner() {
  const isOffline = useOffline()

  if (!isOffline) {
    return null
  }

  return (
    <div
      role="status"
      className="bg-accent text-accent-foreground fixed inset-x-0 bottom-0 z-50 px-4 py-2 text-center text-sm font-medium"
    >
      You&apos;re offline. We&apos;ll keep this page waiting and retry automatically once your
      connection is back.
    </div>
  )
}
