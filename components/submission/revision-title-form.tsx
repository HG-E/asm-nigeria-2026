"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/submission/rich-text-editor"

type Values = { title: string; keywords: string[] }
type SaveResult = { error: string } | { success: true }

// A revision is the one point in the whole flow where the title and
// keywords are supposed to change -- it's usually exactly what the
// reviewer's note is asking for (fix a capitalization, drop a word,
// un-italicize a species name). Unlike FormattingEditor (used once a
// submission is under review or accepted, where the words must stay
// locked so the committee is still looking at what they already saw),
// this is a real edit: whatever is typed here is what gets saved.
export function RevisionTitleForm({
  initial,
  save,
}: {
  initial: Values
  save: (input: Values) => Promise<SaveResult>
}) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(initial)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = values.title !== initial.title || values.keywords.some((k, i) => k !== initial.keywords[i])

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const result = await save(values)
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error })
      } else {
        setMessage({ kind: "ok", text: "Saved." })
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Title &amp; keywords</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Make the changes the reviewer asked for here &mdash; wording, capitalization, punctuation, not
          just italics or bold.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Title</p>
        <RichTextEditor
          value={values.title}
          onChange={(title) => setValues((v) => ({ ...v, title }))}
          label="Title"
          minRows={2}
        />
      </div>

      {values.keywords.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Keywords</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {values.keywords.map((keyword, i) => (
              <RichTextEditor
                key={i}
                value={keyword}
                onChange={(next) =>
                  setValues((v) => ({ ...v, keywords: v.keywords.map((k, j) => (j === i ? next : k)) }))
                }
                label={`Keyword ${i + 1}`}
                suggest={false}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {message && (
        <p className={message.kind === "ok" ? "text-sm text-green-700" : "text-destructive text-sm"} role="status">
          {message.text}
        </p>
      )}

      <Button type="button" onClick={handleSave} disabled={pending || !dirty}>
        {pending ? "Saving..." : "Save title & keywords"}
      </Button>
    </div>
  )
}
