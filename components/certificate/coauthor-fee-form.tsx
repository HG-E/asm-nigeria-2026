"use client"

import { useRef, useState, useTransition } from "react"

import { submitCoauthorFeeAction } from "@/app/certificate/pay-coauthor-fee/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CoauthorFeeForm({ defaultEmail, defaultName }: { defaultEmail: string; defaultName: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitCoauthorFeeAction(formData)
      // A successful submit redirects server-side and never returns here --
      // only an error result reaches this line.
      if (result && "error" in result) {
        setError(result.error)
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Your full name</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={defaultName}
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Your email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultEmail}
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
        <p className="text-muted-foreground text-xs">
          Use the exact email listed for you as a co-author on the abstract.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="receipt">Payment receipt or screenshot</Label>
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
        {pending ? "Submitting..." : "Submit receipt"}
      </Button>
    </form>
  )
}
