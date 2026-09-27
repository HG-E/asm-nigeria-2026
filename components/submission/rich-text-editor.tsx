"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Extension } from "@tiptap/core"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import StarterKit from "@tiptap/starter-kit"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import type { Editor, JSONContent } from "@tiptap/react"
import { Bold, Italic, RemoveFormatting, Sparkles, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Underline as UnderlineIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { normalizeRich, parseRich, serializeRich, type RichMark, type RichRun } from "@/lib/rich-text"
import { findItalicSuggestions, type Suggestion } from "@/lib/taxon-suggest"
import { cn } from "@/lib/utils"

// A small Word-style editor for the boxes an author fills in: italic, bold,
// underline, superscript and subscript -- and nothing else. What goes in and
// comes out is the stored format from lib/rich-text.ts, so every screen and
// the Book of Abstracts show exactly what was typed.
//
// Everything is a single paragraph (Enter does nothing): titles, keywords and
// each abstract section are one paragraph each, and abstract normalization
// collapses line breaks anyway.

const MARK_FOR_NODE: Record<string, RichMark> = {
  bold: "b",
  italic: "i",
  underline: "u",
  superscript: "sup",
  subscript: "sub",
}
const NODE_FOR_MARK: Record<RichMark, string> = {
  b: "bold",
  i: "italic",
  u: "underline",
  sup: "superscript",
  sub: "subscript",
}

function toDoc(value: string): JSONContent {
  const runs = parseRich(value)
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: runs.map((run) => ({
          type: "text",
          text: run.text,
          marks: run.marks.length ? run.marks.map((m) => ({ type: NODE_FOR_MARK[m] })) : undefined,
        })),
      },
    ],
  }
}

function fromDoc(doc: JSONContent): string {
  const runs: RichRun[] = []
  const paragraphs = doc.content ?? []
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) runs.push({ text: " ", marks: [] })
    for (const node of paragraph.content ?? []) {
      if (node.type !== "text" || !node.text) continue
      const marks = (node.marks ?? [])
        .map((m) => MARK_FOR_NODE[m.type as string])
        .filter((m): m is RichMark => Boolean(m))
      runs.push({ text: node.text, marks })
    }
  })
  return normalizeRich(serializeRich(runs))
}

// One paragraph only: swallow Enter (Shift-Enter too).
const SingleParagraph = Extension.create({
  name: "singleParagraph",
  addKeyboardShortcuts() {
    return { Enter: () => true, "Shift-Enter": () => true }
  },
})

// Plain text of the editor plus, for every character, its position in the
// document and whether it is already italic -- what the suggestion finder and
// the "apply" step need.
function describeDoc(editor: Editor) {
  let plain = ""
  const positions: number[] = []
  const italic: boolean[] = []
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const isItalic = node.marks.some((m) => m.type.name === "italic")
    for (let i = 0; i < node.text.length; i++) {
      plain += node.text[i]
      positions.push(pos + i)
      italic.push(isItalic)
    }
  })
  return { plain, positions, italic }
}

export function RichTextEditor({
  value,
  onChange,
  id,
  label,
  minRows = 1,
  disabled = false,
  suggest = true,
  className,
  placeholder,
  onEnter,
  commitOnComma = false,
  onBlur,
  compact = false,
}: {
  value: string
  onChange: (next: string) => void
  id?: string
  label: string // accessible name for the box
  minRows?: number
  disabled?: boolean
  suggest?: boolean
  className?: string
  placeholder?: string
  // Called when Enter (or, with commitOnComma, a comma) is pressed -- how the
  // keyword box turns what was typed into a keyword.
  onEnter?: () => void
  commitOnComma?: boolean
  onBlur?: () => void
  // Slimmer toolbar for one-line boxes such as keywords.
  compact?: boolean
}) {
  const lastEmitted = useRef(value)
  const onEnterRef = useRef(onEnter)
  const onBlurRef = useRef(onBlur)
  useEffect(() => {
    onEnterRef.current = onEnter
    onBlurRef.current = onBlur
  })
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        codeBlock: false,
        dropcursor: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        link: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        strike: false,
        trailingNode: false,
      }),
      Superscript,
      Subscript,
      SingleParagraph,
    ],
    []
  )

  const editor = useEditor({
    extensions,
    content: toDoc(value),
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        class: "outline-none",
        style: `min-height: ${minRows * 1.5}rem`,
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" || (commitOnComma && event.key === ",")) {
          event.preventDefault()
          onEnterRef.current?.()
          return true
        }
        return false
      },
      handleDOMEvents: {
        blur: () => {
          onBlurRef.current?.()
          return false
        },
      },
    },
    onUpdate: ({ editor: e }) => {
      const next = fromDoc(e.getJSON())
      lastEmitted.current = next
      onChange(next)
    },
  })

  // Keep the box in step when the value is changed from outside (form reset,
  // restoring a saved version) -- but never on our own emissions, which would
  // reset the cursor while typing.
  useEffect(() => {
    if (!editor) return
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      editor.commands.setContent(toDoc(value), { emitUpdate: false })
    }
  }, [value, editor])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [disabled, editor])

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      b: e?.isActive("bold") ?? false,
      i: e?.isActive("italic") ?? false,
      u: e?.isActive("underline") ?? false,
      sup: e?.isActive("superscript") ?? false,
      sub: e?.isActive("subscript") ?? false,
      empty: e?.isEmpty ?? true,
    }),
  })

  function runSuggest() {
    if (!editor) return
    const { plain, italic } = describeDoc(editor)
    setSuggestions(findItalicSuggestions(plain, italic))
  }

  function apply(items: Suggestion[]) {
    if (!editor) return
    const { positions } = describeDoc(editor)
    let chain = editor.chain()
    for (const s of items) {
      const from = positions[s.start]
      const to = positions[s.end - 1] + 1
      if (from === undefined || to === undefined) continue
      chain = chain.setTextSelection({ from, to }).setMark("italic")
    }
    chain.setTextSelection(editor.state.doc.content.size - 1).run()
    // Recompute what is still left to suggest.
    const after = describeDoc(editor)
    setSuggestions(findItalicSuggestions(after.plain, after.italic))
  }

  const tool = (
    label: string,
    on: boolean,
    run: () => void,
    icon: React.ReactNode,
    hint: string
  ) => (
    <Button
      key={label}
      type="button"
      variant={on ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={on}
      title={`${label} (${hint})`}
      disabled={disabled}
      // Keep the selection in the box while a tool is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {icon}
    </Button>
  )

  return (
    <div className={cn("bg-background focus-within:ring-ring/50 focus-within:border-ring rounded-md border focus-within:ring-3", disabled && "opacity-70", className)}>
      <div className={cn("flex flex-wrap items-center gap-0.5 border-b px-1.5", compact ? "py-0.5" : "py-1")}>
        {tool("Italic", active?.i ?? false, () => editor?.chain().focus().toggleItalic().run(), <Italic className="size-4" />, "Ctrl+I")}
        {tool("Bold", active?.b ?? false, () => editor?.chain().focus().toggleBold().run(), <Bold className="size-4" />, "Ctrl+B")}
        {tool("Underline", active?.u ?? false, () => editor?.chain().focus().toggleUnderline().run(), <UnderlineIcon className="size-4" />, "Ctrl+U")}
        {tool("Superscript", active?.sup ?? false, () => editor?.chain().focus().toggleSuperscript().run(), <SuperscriptIcon className="size-4" />, "e.g. 10⁶")}
        {tool("Subscript", active?.sub ?? false, () => editor?.chain().focus().toggleSubscript().run(), <SubscriptIcon className="size-4" />, "e.g. CO₂")}
        {tool("Clear formatting", false, () => editor?.chain().focus().unsetAllMarks().run(), <RemoveFormatting className="size-4" />, "selected text")}
        {suggest && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto gap-1 text-xs"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={runSuggest}
          >
            <Sparkles className="size-3.5" />
            Suggest italics
          </Button>
        )}
      </div>

      <div className="rich-editor relative px-3 py-2 text-sm">
        {placeholder && active?.empty && (
          <span className="text-muted-foreground pointer-events-none absolute" aria-hidden>
            {placeholder}
          </span>
        )}
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div style={{ minHeight: `${minRows * 1.5}rem` }} aria-hidden />
        )}
      </div>

      {suggestions && (
        <div className="bg-muted/40 space-y-2 border-t px-3 py-2 text-sm" role="status">
          {suggestions.length === 0 ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                No organism or gene names found that still need italics.
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSuggestions(null)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"} — check each, then apply
                </span>
                <span className="flex gap-1">
                  <Button type="button" size="sm" onClick={() => apply(suggestions)}>
                    Italicise all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSuggestions(null)}>
                    Close
                  </Button>
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <li key={`${s.start}-${s.end}`}>
                    <button
                      type="button"
                      className="hover:bg-accent rounded-full border px-2.5 py-0.5 text-xs"
                      title={s.kind === "gene" ? "Gene name (the protein is not italic)" : s.kind === "phrase" ? "Latin phrase" : "Organism name"}
                      onClick={() => apply([s])}
                    >
                      <em>{s.text}</em> <span className="text-muted-foreground">+ italic</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                Suggestions only. Species like <em>Salmonella</em> Typhi keep the serovar upright, and
                &ldquo;spp.&rdquo; is never italic. Please check them.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
