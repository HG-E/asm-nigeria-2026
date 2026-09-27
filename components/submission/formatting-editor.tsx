"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/submission/rich-text-editor"
import { ABSTRACT_SECTIONS, type AbstractSections } from "@/lib/abstract-structure"
import { plainKey } from "@/lib/rich-text"

type Values = { title: string; keywords: string[]; sections: AbstractSections | null }
type SaveResult = { error: string } | { success: true }

// Fix italics, bold, underline, superscript and subscript on an abstract that
// is already in (under review or accepted). The words are fixed: a box whose
// words differ from the original is flagged and cannot be saved, and the
// server checks the same thing again, so this can be offered on a submission
// the committee has already seen without re-opening it to edits.
export function FormattingEditor({
  initial,
  save,
  sectionsEditable = true,
}: {
  initial: Values
  save: (input: Values) => Promise<SaveResult>
  // False while a revision is open: the abstract itself is edited in the
  // revision form, so only the title and keywords are formattable here.
  sectionsEditable?: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(initial)
  const [resetKey, setResetKey] = useState(0)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const showSections = sectionsEditable && initial.sections !== null

  // Which boxes no longer contain the original words.
  const wordsChanged: string[] = []
  if (plainKey(values.title) !== plainKey(initial.title)) wordsChanged.push("title")
  values.keywords.forEach((k, i) => {
    if (plainKey(k) !== plainKey(initial.keywords[i])) wordsChanged.push(`keyword ${i + 1}`)
  })
  if (showSections && values.sections && initial.sections) {
    for (const s of ABSTRACT_SECTIONS) {
      if (plainKey(values.sections[s.key]) !== plainKey(initial.sections[s.key])) wordsChanged.push(s.label)
    }
  }

  const dirty =
    values.title !== initial.title ||
    values.keywords.some((k, i) => k !== initial.keywords[i]) ||
    (showSections &&
      values.sections !== null &&
      initial.sections !== null &&
      ABSTRACT_SECTIONS.some((s) => values.sections![s.key] !== initial.sections![s.key]))

  function handleSave() {
    setMessage(null)
    startTransition(async () => {
      const result = await save({ ...values, sections: showSections ? values.sections : null })
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error })
      } else {
        setMessage({ kind: "ok", text: "Formatting saved." })
        router.refresh()
      }
    })
  }

  function handleReset() {
    setValues(initial)
    setResetKey((k) => k + 1)
    setMessage(null)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Italics and other formatting</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Select words and use the toolbar (or Ctrl+I for italic) to italicise organism and gene names, or add
          superscript and subscript. Only the formatting can change here &mdash; the words stay exactly as they
          are.
        </p>
      </div>

      <div key={resetKey} className="space-y-4">
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

        {showSections &&
          values.sections &&
          ABSTRACT_SECTIONS.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <p className="text-sm font-medium">{s.label}</p>
              <RichTextEditor
                value={values.sections![s.key]}
                onChange={(next) =>
                  setValues((v) => ({ ...v, sections: { ...v.sections!, [s.key]: next } }))
                }
                label={s.label}
                minRows={s.rows}
              />
            </div>
          ))}
      </div>

      {wordsChanged.length > 0 && (
        <p className="text-destructive text-sm" role="alert">
          The words in {wordsChanged.join(", ")} have changed. Only formatting can be edited here &mdash; use
          &ldquo;Undo my changes&rdquo; and format the original words.
        </p>
      )}
      {message && (
        <p className={message.kind === "ok" ? "text-sm text-green-700" : "text-destructive text-sm"} role="status">
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={pending || !dirty || wordsChanged.length > 0}>
          {pending ? "Saving..." : "Save formatting"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} disabled={pending || !dirty}>
          Undo my changes
        </Button>
      </div>
    </div>
  )
}
