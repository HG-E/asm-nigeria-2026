import { ABSTRACT_SECTIONS, isStructured } from "@/lib/abstract-structure"

type VersionText = {
  abstract_text?: string | null
  abstract_background?: string | null
  abstract_methods?: string | null
  abstract_results?: string | null
  abstract_conclusion?: string | null
}

const COLUMN_FOR = {
  background: "abstract_background",
  methods: "abstract_methods",
  results: "abstract_results",
  conclusion: "abstract_conclusion",
} as const

// Structured abstracts render as four labelled paragraphs; abstracts that
// predate the structure render exactly as they always did (one preserved-
// whitespace block), so older submissions look unchanged everywhere.
export function AbstractBody({
  version,
  className,
  fallback = "No content yet.",
}: {
  version: VersionText | null | undefined
  className?: string
  fallback?: string
}) {
  if (version && isStructured(version)) {
    return (
      <div className={className ?? "space-y-3"}>
        {ABSTRACT_SECTIONS.map((section) => (
          <p key={section.key}>
            <span className="font-semibold">{section.label}: </span>
            {version[COLUMN_FOR[section.key]]}
          </p>
        ))}
      </div>
    )
  }
  return <p className={className ?? "whitespace-pre-wrap"}>{version?.abstract_text || fallback}</p>
}
