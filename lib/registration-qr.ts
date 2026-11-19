import "server-only"

import QRCode from "qrcode"

// A badge QR encodes the registration's own reference number, not a signed
// URL or anything else time-limited -- it's generated fresh from plain text
// every time, so it never expires and never needs regenerating once printed.
// The "ASM-REG:" prefix makes a scanned payload self-describing: the scanner
// can reject a QR from something else (a random URL, another event's badge)
// instead of silently trying to look it up as a reference number.
const PAYLOAD_PREFIX = "ASM-REG:"

export function qrPayloadFor(referenceNumber: string): string {
  return `${PAYLOAD_PREFIX}${referenceNumber}`
}

// Returns null if the scanned text isn't one of this conference's badge QRs.
export function referenceNumberFromPayload(payload: string): string | null {
  const trimmed = payload.trim()
  if (!trimmed.startsWith(PAYLOAD_PREFIX)) return null
  const ref = trimmed.slice(PAYLOAD_PREFIX.length).trim()
  return ref || null
}

export async function generateQrPng(referenceNumber: string): Promise<Buffer> {
  return QRCode.toBuffer(qrPayloadFor(referenceNumber), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  })
}

export async function generateQrDataUrl(referenceNumber: string): Promise<string> {
  return QRCode.toDataURL(qrPayloadFor(referenceNumber), {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 400,
  })
}
