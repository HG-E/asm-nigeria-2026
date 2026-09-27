"use client"

import { type Control, useWatch } from "react-hook-form"

import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RichText } from "@/components/submission/rich-text"
import { RichTextEditor } from "@/components/submission/rich-text-editor"
import {
  ABSTRACT_SECTIONS,
  ABSTRACT_TOTAL_MAX,
  countWords,
  normalizeSection,
} from "@/lib/abstract-structure"
import { cn } from "@/lib/utils"
import type { Step3Input } from "@/lib/validations/submission"

// Whether every section is inside its limits -- lets the parent form disable
// its submit buttons without re-deriving the rules.
export function useAbstractOverLimit(control: Control<Step3Input>) {
  const values = useWatch({ control })
  return ABSTRACT_SECTIONS.some(
    (s) => countWords(normalizeSection(s.key, values[s.key] ?? "")) > s.max
  )
}

export function StructuredAbstractFields({
  control,
  legacyText,
}: {
  control: Control<Step3Input>
  // Free-text abstract from before the four-part structure existed. Shown for
  // reference only, so an author restructuring an older draft or a revision
  // can copy from it -- it is never submitted as-is.
  legacyText?: string
}) {
  const values = useWatch({ control })
  const total = ABSTRACT_SECTIONS.reduce(
    (sum, s) => sum + countWords(normalizeSection(s.key, values[s.key] ?? "")),
    0
  )

  return (
    <div className="space-y-5">
      <div className="bg-muted/50 rounded-lg border p-4 text-sm">
        <p className="font-medium">Write your abstract in four parts</p>
        <p className="text-muted-foreground mt-1">
          Each part has its own word limit ({ABSTRACT_SECTIONS.map((s) => `${s.label} ${s.max}`).join(" · ")},{" "}
          {ABSTRACT_TOTAL_MAX} words in total). Abstracts missing results or methods are the most common reason
          for a poor review, so all four parts are required. Don&apos;t type the headings yourself &mdash; they
          are added automatically. Format the text as you would in Word: <em>italic</em> for organism and
          gene names, plus bold, underline, superscript (10<sup>6</sup>) and subscript (CO<sub>2</sub>). The
          &ldquo;Suggest italics&rdquo; button finds names for you to confirm.
        </p>
      </div>

      {legacyText && (
        <details className="rounded-lg border p-4 text-sm">
          <summary className="cursor-pointer font-medium">Your earlier abstract text (for reference)</summary>
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
            <RichText value={legacyText} />
          </p>
          <p className="text-muted-foreground mt-2">
            Abstracts now follow the four-part structure, so please rewrite it into the boxes below.
          </p>
        </details>
      )}

      {ABSTRACT_SECTIONS.map((section) => {
        const words = countWords(normalizeSection(section.key, values[section.key] ?? ""))
        const over = words > section.max
        const short = words > 0 && words < section.min
        return (
          <FormField
            key={section.key}
            control={control}
            name={section.key}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{section.label}</FormLabel>
                <p className="text-muted-foreground text-xs">{section.hint}</p>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  label={section.label}
                  minRows={section.rows}
                />
                <p
                  className={cn(
                    "text-sm",
                    over ? "text-destructive font-medium" : short ? "text-amber-600" : "text-muted-foreground"
                  )}
                >
                  {words} / {section.max} words
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      })}

      <p
        className={cn(
          "text-sm font-medium",
          total > ABSTRACT_TOTAL_MAX ? "text-destructive" : "text-muted-foreground"
        )}
      >
        Total: {total} / {ABSTRACT_TOTAL_MAX} words
      </p>
    </div>
  )
}
