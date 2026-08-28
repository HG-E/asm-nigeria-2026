"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CertType = "participation" | "presentation"

const COPY: Record<CertType, { label: string; placeholder: string; hint: string }> = {
  participation: {
    label: "Registration reference number",
    placeholder: "REG-ASM-ABJ-2026-XXX",
    hint: "The reference number from your conference registration.",
  },
  presentation: {
    label: "Abstract reference number",
    placeholder: "ASM-ABJ-2026-XXX-XXX",
    hint: "The reference number from your abstract submission.",
  },
}

export function CertificateForm({ defaultType }: { defaultType: CertType }) {
  const [type, setType] = useState<CertType>(defaultType)
  const copy = COPY[type]

  return (
    <form method="POST" action="/certificate/download" className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#eef2fa] p-1">
        {(["participation", "presentation"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={
              type === t
                ? "rounded-md bg-white px-3 py-2 text-sm font-medium text-[#003087] shadow-sm"
                : "text-muted-foreground rounded-md px-3 py-2 text-sm font-medium"
            }
          >
            {t === "participation" ? "Participation" : "Presentation"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      <div className="space-y-2">
        <Label htmlFor="referenceNumber">{copy.label}</Label>
        <Input
          id="referenceNumber"
          name="referenceNumber"
          placeholder={copy.placeholder}
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
        <p className="text-muted-foreground text-xs">{copy.hint}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          className="focus-visible:border-[#003087] focus-visible:ring-[#003087]/20"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[#003087] text-white shadow-[0_4px_16px_rgba(0,48,135,0.28)] hover:bg-[#001f5b]"
      >
        Download certificate
      </Button>
    </form>
  )
}
