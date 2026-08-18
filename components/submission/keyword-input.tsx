"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export function KeywordInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function commitDraft() {
    const keyword = draft.trim()
    if (keyword && !value.includes(keyword)) {
      onChange([...value, keyword])
    }
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            commitDraft()
          }
        }}
        onBlur={commitDraft}
        placeholder="Type a keyword and press Enter"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1">
              {keyword}
              <button
                type="button"
                onClick={() => onChange(value.filter((k) => k !== keyword))}
                aria-label={`Remove ${keyword}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
