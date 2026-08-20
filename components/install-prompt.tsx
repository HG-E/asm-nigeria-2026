"use client"

import { useEffect, useState } from "react"

const DISMISS_KEY = "asm-2026-ios-install-prompt-dismissed"

// Android/desktop Chrome and Edge show their own native "Install app" UI
// once the manifest + HTTPS criteria are met -- no custom UI needed there.
// iOS Safari never surfaces an install affordance on its own, so this is
// the one platform that needs an explicit "Add to Home Screen" hint.
export function InstallPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1"
    if (!isIOS || isStandalone || dismissed) return
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // localStorage unavailable (private browsing etc.) -- dismissal just won't persist
    }
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="bg-card text-card-foreground border-border fixed inset-x-4 bottom-4 z-50 flex items-start gap-3 rounded-lg border p-4 text-sm shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <span aria-hidden="true" className="text-lg">📲</span>
      <p className="flex-1">
        Install this app: tap the Share button <span aria-hidden="true">⎋</span>, then &ldquo;Add
        to Home Screen&rdquo; <span aria-hidden="true">➕</span>.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground shrink-0 text-base leading-none"
      >
        ✕
      </button>
    </div>
  )
}
