"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Circle, TriangleAlert } from "lucide-react"

import { checkInByPayloadAction, type CheckInResult } from "@/app/registration-desk/scan/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"

// A scan result stays on screen until the next successful decode, not just
// a toast -- the person checking people in at the door needs to actually
// read the name before the next badge comes up, not catch it out of the
// corner of their eye.
type ScanState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "result"; result: CheckInResult }

export function RegistrationScanner() {
  const containerId = "registration-scanner-viewport"
  const [state, setState] = useState<ScanState>({ status: "idle" })
  const [cameraError, setCameraError] = useState<string | null>(null)
  // Guards against the same still-in-frame QR firing another check-in call
  // every single video frame while it's held in view.
  const busyRef = useRef(false)
  const lastPayloadRef = useRef<string | null>(null)
  const lastAtRef = useRef(0)

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null
    let cancelled = false

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode")
      if (cancelled) return
      scanner = new Html5Qrcode(containerId)

      async function onDecoded(decodedText: string) {
        const now = Date.now()
        // Same code decoded again within 4s of the last successful handling
        // (the badge is just still sitting in frame) -- ignore it.
        if (busyRef.current) return
        if (lastPayloadRef.current === decodedText && now - lastAtRef.current < 4000) return

        busyRef.current = true
        lastPayloadRef.current = decodedText
        lastAtRef.current = now
        setState({ status: "processing" })

        const result = await checkInByPayloadAction(decodedText)
        setState({ status: "result", result })
        busyRef.current = false
      }

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            onDecoded(decodedText)
          },
          () => {
            // Fires on every frame with no QR in view -- expected, not an error.
          }
        )
      } catch {
        if (!cancelled) {
          setCameraError(
            "Could not access the camera. Allow camera access for this site, or check that another app isn't already using it."
          )
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {})
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div id={containerId} className="bg-muted aspect-square w-full max-w-sm mx-auto" />
      </Card>

      {cameraError && (
        <Alert variant="destructive">
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      )}

      {state.status === "idle" && !cameraError && (
        <p className="text-muted-foreground text-center text-sm">
          Point the camera at a badge&apos;s QR code to check that person in.
        </p>
      )}

      {state.status === "processing" && (
        <p className="text-muted-foreground text-center text-sm">Checking in...</p>
      )}

      {state.status === "result" && "error" in state.result && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription>{state.result.error}</AlertDescription>
        </Alert>
      )}

      {state.status === "result" && "success" in state.result && (
        <Card className={state.result.alreadyAttended ? "border-amber-500/50" : "border-green-500/50"}>
          <CardContent className="flex items-start gap-3 pt-6">
            {state.result.alreadyAttended ? (
              <Circle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            )}
            <div className="space-y-1">
              <p className="font-medium">
                {state.result.registration.fullName}{" "}
                <span className="text-muted-foreground font-mono text-xs">
                  {state.result.registration.referenceNumber}
                </span>
              </p>
              <p className="text-muted-foreground text-sm">
                {state.result.registration.participantCategory}
                {state.result.registration.institution ? ` · ${state.result.registration.institution}` : ""}
              </p>
              <p className="text-sm font-medium">
                {state.result.alreadyAttended ? "Already checked in" : "Checked in just now"}
              </p>
              {!state.result.registration.paymentVerified && (
                <p className="text-sm text-amber-600">Payment not yet verified for this registrant.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
