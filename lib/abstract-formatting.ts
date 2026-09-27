import "server-only"

import {
  ABSTRACT_SECTIONS,
  composeAbstract,
  isStructured,
  normalizeKeywords,
  normalizeSections,
  normalizeTitle,
  sectionsFromVersion,
  type AbstractSections,
} from "@/lib/abstract-structure"
import { plainKey } from "@/lib/rich-text"
import { createAdminClient } from "@/lib/supabase/admin"

// The formatting-only edit: italics, bold, underline, superscript, subscript on
// the title, keywords and (four-part) abstract of a submission that is already
// in, so an author -- or the admin on their behalf -- can fix an organism name
// that reviewers flagged without touching what the abstract says.
//
// "Without touching what it says" is enforced here, on the server, and not just
// in the form: the words (formatting stripped, whitespace collapsed) of every
// field must be identical to what is stored, or nothing is saved. That is what
// lets this be allowed on a submission under review or already accepted without
// re-opening it to edits.

// Drafts are edited in the wizard; rejected/withdrawn are final. A submission
// waiting on a revision edits its abstract through the revision form, so here
// it may only have its title and keywords formatted.
const FORMATTABLE = [
  "submitted",
  "screening",
  "assigned",
  "under_review",
  "reviews_completed",
  "decision_pending",
  "revision_required",
  "accepted",
  "accepted_oral",
  "accepted_poster",
] as const

export function canFormatStatus(status: string) {
  return (FORMATTABLE as readonly string[]).includes(status)
}

export type FormattingInput = {
  title: string
  keywords: string[]
  sections: AbstractSections | null
}

export type FormattingActor = { id: string; email: string | null; role: "author" | "admin" }

export async function applyFormattingOnly(
  submissionId: string,
  input: FormattingInput,
  actor: FormattingActor
): Promise<{ error: string } | { success: true; changed: boolean }> {
  const admin = createAdminClient()

  const { data: submission } = await admin
    .from("submissions")
    .select("id, status, current_version, corresponding_author_id, title, keywords")
    .eq("id", submissionId)
    .maybeSingle()

  // Same message whether it doesn't exist or isn't theirs: no probing.
  if (!submission || (actor.role === "author" && submission.corresponding_author_id !== actor.id)) {
    return { error: "This abstract could not be found." }
  }
  if (!canFormatStatus(submission.status)) {
    return { error: "Formatting can no longer be changed on this submission." }
  }

  const newTitle = normalizeTitle(input.title)
  const newKeywords = normalizeKeywords(input.keywords)

  // Title.
  if (plainKey(newTitle) !== plainKey(submission.title)) {
    return { error: "The title's words have changed. Only formatting can be edited here." }
  }
  // Keywords: same words in the same order.
  const oldKeywords = submission.keywords ?? []
  if (
    newKeywords.length !== oldKeywords.length ||
    newKeywords.some((k, i) => plainKey(k) !== plainKey(oldKeywords[i]))
  ) {
    return { error: "The keywords' words have changed. Only formatting can be edited here." }
  }

  // Abstract sections -- only for a four-part abstract that is not out for revision.
  let newSections: AbstractSections | null = null
  let oldSections: AbstractSections | null = null
  let versionId: string | null = null
  if (input.sections && submission.status !== "revision_required") {
    const { data: version } = await admin
      .from("submission_versions")
      .select(
        "id, abstract_text, abstract_background, abstract_methods, abstract_results, abstract_conclusion"
      )
      .eq("submission_id", submissionId)
      .eq("version_number", submission.current_version)
      .maybeSingle()

    if (version && isStructured(version)) {
      oldSections = sectionsFromVersion(version)
      newSections = normalizeSections(input.sections)
      for (const s of ABSTRACT_SECTIONS) {
        if (plainKey(newSections[s.key]) !== plainKey(oldSections[s.key])) {
          return { error: `The words in ${s.label} have changed. Only formatting can be edited here.` }
        }
      }
      versionId = version.id
    }
  }

  const titleChanged = newTitle !== submission.title
  const keywordsChanged = newKeywords.some((k, i) => k !== oldKeywords[i])
  const changedSections =
    newSections && oldSections ? ABSTRACT_SECTIONS.filter((s) => newSections![s.key] !== oldSections![s.key]) : []

  if (!titleChanged && !keywordsChanged && changedSections.length === 0) {
    return { success: true, changed: false }
  }

  if (titleChanged || keywordsChanged) {
    const { error } = await admin
      .from("submissions")
      .update({ title: newTitle, keywords: newKeywords })
      .eq("id", submissionId)
    if (error) return { error: "Could not save. Please try again." }
  }
  if (versionId && newSections && changedSections.length > 0) {
    const { error } = await admin
      .from("submission_versions")
      .update({
        abstract_background: newSections.background,
        abstract_methods: newSections.methods,
        abstract_results: newSections.results,
        abstract_conclusion: newSections.conclusion,
        abstract_text: composeAbstract(newSections),
      })
      .eq("id", versionId)
    if (error) return { error: "Could not save. Please try again." }
  }

  // Full record of what was there before, so any formatting change can be
  // reviewed or undone.
  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action: "abstract_formatting_updated",
    entity_type: "submission",
    entity_id: submissionId,
    previous_status: submission.status,
    new_status: submission.status,
    metadata: {
      by: actor.role,
      version_number: submission.current_version,
      changed: [
        ...(titleChanged ? ["title"] : []),
        ...(keywordsChanged ? ["keywords"] : []),
        ...changedSections.map((s) => s.key),
      ],
      previous: {
        title: submission.title,
        keywords: oldKeywords,
        ...(oldSections ? { sections: oldSections } : {}),
      },
    },
  })

  return { success: true, changed: true }
}
