"use client"

import { type FormEvent, useState, useTransition } from "react"

import { addWorkshopToRegistrationAction } from "@/app/register-workshop/add-on-actions"
import { FileUploadField } from "@/components/registration/file-upload-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currentRegistrationPeriod, WORKSHOP_FEE } from "@/lib/registration-fees"

const MAX_FILE_MB = 1
const period = currentRegistrationPeriod()

export function WorkshopAddOnForm() {
  const [referenceNumber, setReferenceNumber] = useState("")
  const [email, setEmail] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ referenceNumber: string; amountExpected: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setReceiptError(null)

    if (!receiptFile) {
      setReceiptError("Please upload your payment receipt or screenshot for the workshop fee.")
      return
    }

    const formData = new FormData()
    formData.set("referenceNumber", referenceNumber.trim())
    formData.set("email", email.trim())
    formData.set("receipt", receiptFile)

    startTransition(async () => {
      try {
        const res = await addWorkshopToRegistrationAction(formData)
        if ("error" in res) {
          setSubmitError(res.error)
          return
        }
        setResult(res)
      } catch {
        setSubmitError(
          "This could not be submitted -- this is usually a dropped internet connection or a file that's too large. Please check your connection and try again."
        )
      }
    })
  }

  if (result) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Workshop added</h2>
        <p className="text-muted-foreground text-sm">
          The Pre &amp; Post-Conference Hands-On Workshop has been added to registration{" "}
          <strong className="text-foreground">{result.referenceNumber}</strong>. New amount due:{" "}
          <strong className="text-foreground">{result.amountExpected}</strong>. The admin will verify your
          additional payment within 2-3 working days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-muted/50 space-y-1 rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground">
          Already registered for the conference? Enter the reference number and email from that registration,
          and upload your receipt for the additional {WORKSHOP_FEE[period]} workshop fee.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addon-reference">Registration reference number</Label>
        <Input
          id="addon-reference"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="REG-ASM-ABJ-2026-XXX"
          required
        />
        <p className="text-muted-foreground text-xs">The reference number from your conference registration.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="addon-email">Email address</Label>
        <Input id="addon-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <FileUploadField
        label={`Payment receipt or screenshot for the workshop fee (${WORKSHOP_FEE[period]})`}
        hint={`A photo or screenshot of your bank transfer confirmation for the additional workshop fee. PDF, JPG, or PNG, up to ${MAX_FILE_MB}MB.`}
        accept=".pdf,.jpg,.jpeg,.png"
        allowedTypes={["pdf", "jpg", "jpeg", "png"]}
        file={receiptFile}
        onChange={setReceiptFile}
        error={receiptError}
        setError={setReceiptError}
      />

      {submitError && (
        <div className="border-destructive bg-destructive/5 text-destructive rounded-lg border p-4 text-sm" role="alert">
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1">{submitError}</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Submitting..." : "Add workshop to my registration"}
      </Button>
    </form>
  )
}
