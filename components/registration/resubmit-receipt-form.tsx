"use client"

import { useState, useTransition } from "react"

import { resubmitRegistrationReceiptAction } from "@/app/register-conference/resubmit/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResubmitReceiptForm({ defaultReferenceNumber, defaultEmail }: { defaultReferenceNumber: string; defaultEmail: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await resubmitRegistrationReceiptAction(formData)
      // A successful submit redirects server-side and never returns here --
      // only an error result reaches this line.
      if (result && "error" in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="referenceNumber">Registration reference number</Label>
        <Input
          id="referenceNumber"
          name="referenceNumber"
          defaultValue={defaultReferenceNumber}
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt">Corrected payment receipt or screenshot</Label>
        <Input id="receipt" name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
        <p className="text-muted-foreground text-xs">Accepted formats: PDF, JPG, PNG. Maximum size: 1MB.</p>
      </div>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-[#003087] text-white shadow-[0_4px_16px_rgba(0,48,135,0.28)] hover:bg-[#001f5b]"
      >
        {pending ? "Submitting..." : "Resubmit receipt"}
      </Button>
    </form>
  )
}
