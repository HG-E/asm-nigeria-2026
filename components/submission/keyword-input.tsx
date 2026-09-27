"use client"

import { useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { RichText } from "@/components/submission/rich-text"
import { RichTextEditor } from "@/components/submission/rich-text-editor"
import { collapseRichWhitespace, plainKey, toPlain } from "@/lib/rich-text"

// Keywords can carry formatting too (an italic genus name, for instance), so
// the box is the same small editor as the title. Enter or a comma turns what
// was typed into a keyword; duplicates are compared on the words alone.
export function KeywordInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState("")

  function commitDraft() {
    const keyword = collapseRichWhitespace(draft)
    if (plainKey(keyword) && !value.some((k) => plainKey(k).toLowerCase() === plainKey(keyword).toLowerCase())) {
      onChange([...value, keyword])
    }
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <RichTextEditor
        value={draft}
        onChange={setDraft}
        label="Keyword"
        placeholder="Type a keyword and press Enter"
        onEnter={commitDraft}
        onBlur={commitDraft}
        commitOnComma
        compact
        suggest={false}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1">
              <RichText value={keyword} />
              <button
                type="button"
                onClick={() => onChange(value.filter((k) => k !== keyword))}
                aria-label={`Remove ${toPlain(keyword)}`}
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
