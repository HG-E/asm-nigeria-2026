"use server"

import { redirect } from "next/navigation"
import { after } from "next/server"

import { requireAuth } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { sendNotifications } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  countWords,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  type Step1Input,
  type Step2Input,
  type Step3Input,
  type Step4Input,
} from "@/lib/validations/submission"

export type ActionResult = { error: string } | { success: true }

async function loadOwnDraft(supabase: Awaited<ReturnType<typeof createClient>>, id: string, authUserId: string) {
  const { data } = await supabase
    .from("submissions")
    .select("id, corresponding_author_id, status, current_version")
    .eq("id", id)
    .single()

  if (!data || data.corresponding_author_id !== authUserId || data.status !== "draft") {
    return null
  }
  return data
}

// Document re-upload is the one piece of editing shared between the initial
// draft flow and a revision -- everything else (title, authors, subtheme,
// declarations) stays locked once a submission has been through review, so
// only this loader (used by recordDocumentAction/deleteDocumentAction)
// accepts revision_required. loadOwnDraft above stays draft-only on purpose.
async function loadOwnEditableSubmission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  authUserId: string
) {
  const { data } = await supabase
    .from("submissions")
    .select("id, corresponding_author_id, status, current_version")
    .eq("id", id)
    .single()

  if (
    !data ||
    data.corresponding_author_id !== authUserId ||
    (data.status !== "draft" && data.status !== "revision_required")
  ) {
    return null
  }
  return data
}

export async function updateStep1Action(id: string, input: Step1Input): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = step1Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      title: parsed.data.title,
      subtheme_id: parsed.data.subthemeId,
      keywords: parsed.data.keywords,
      presentation_preference: parsed.data.presentationPreference,
    })
    .eq("id", id)

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  redirect(`/author/submissions/${id}?step=2`)
}

export async function updateAuthorsAction(id: string, input: Step2Input): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = step2Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  const { error: deleteError } = await supabase
    .from("submission_authors")
    .delete()
    .eq("submission_id", id)
    .eq("is_corresponding", false)

  if (deleteError) {
    return { error: "Could not save co-authors. Please try again." }
  }

  if (parsed.data.coAuthors.length > 0) {
    const { error: insertError } = await supabase.from("submission_authors").insert(
      parsed.data.coAuthors.map((author, index) => ({
        submission_id: id,
        author_order: index + 2,
        is_corresponding: false,
        first_name: author.firstName,
        last_name: author.lastName,
        institution: author.institution,
        department: author.department || null,
        country: author.country,
        email: author.email,
        orcid: author.orcid || null,
      }))
    )
    if (insertError) {
      return { error: "Could not save co-authors. Please try again." }
    }
  }

  redirect(`/author/submissions/${id}?step=3`)
}

export async function updateContentAction(id: string, input: Step3Input): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = step3Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  const conference = await getActiveConference()
  const wordCount = countWords(parsed.data.abstractText)
  if (conference && wordCount > conference.abstract_word_limit) {
    return {
      error: `Your abstract is ${wordCount} words, over the ${conference.abstract_word_limit}-word limit.`,
    }
  }

  const { error } = await supabase
    .from("submission_versions")
    .update({ abstract_text: parsed.data.abstractText, word_count: wordCount })
    .eq("submission_id", id)
    .eq("version_number", draft.current_version)

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  redirect(`/author/submissions/${id}?step=4`)
}

export async function updateDeclarationsAction(id: string, input: Step4Input): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = step4Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  const { error } = await supabase
    .from("submissions")
    .update({
      no_conflict_of_interest: parsed.data.noConflictOfInterest,
      ethical_approval_obtained: parsed.data.ethicalApprovalObtained,
      funding_declaration: parsed.data.fundingDeclaration,
      originality_confirmed: parsed.data.originalityConfirmed,
    })
    .eq("id", id)

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  redirect(`/author/submissions/${id}?step=5`)
}

export async function recordDocumentAction(
  id: string,
  file: { fileName: string; fileType: string; fileSizeBytes: number; storagePath: string }
): Promise<ActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()
  const draft = await loadOwnEditableSubmission(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  if (!file.storagePath.startsWith(`${session.authUserId}/`)) {
    return { error: "Upload failed. Please try again." }
  }

  const conference = await getActiveConference()
  const extension = file.fileName.split(".").pop()?.toLowerCase() ?? ""
  const maxBytes = (conference?.max_file_size_mb ?? 10) * 1024 * 1024

  if (conference && !conference.allowed_file_types.includes(extension)) {
    await supabase.storage.from("abstracts").remove([file.storagePath])
    return { error: "This file type is not permitted." }
  }
  if (file.fileSizeBytes > maxBytes) {
    await supabase.storage.from("abstracts").remove([file.storagePath])
    return { error: "This file exceeds the maximum size allowed." }
  }

  const { data: existing } = await supabase
    .from("submission_documents")
    .select("id, storage_path")
    .eq("submission_id", id)
    .eq("is_current", true)

  if (existing && existing.length > 0) {
    await supabase.storage.from("abstracts").remove(existing.map((d) => d.storage_path))
    await supabase
      .from("submission_documents")
      .delete()
      .in(
        "id",
        existing.map((d) => d.id)
      )
  }

  const { error } = await supabase.from("submission_documents").insert({
    submission_id: id,
    storage_path: file.storagePath,
    file_name: file.fileName,
    file_type: file.fileType,
    file_size_bytes: file.fileSizeBytes,
    uploaded_by: session.authUserId,
    is_current: true,
  })

  if (error) {
    return { error: "Could not save the uploaded file. Please try again." }
  }

  return { success: true }
}

export async function deleteDocumentAction(
  id: string,
  documentId: string
): Promise<ActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()
  const draft = await loadOwnEditableSubmission(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  // Look up the document ourselves rather than trusting a caller-supplied
  // storage path, and scope the delete to THIS submission -- documentId
  // alone isn't enough to prove the file belongs to the submission the
  // editability check just validated.
  const { data: document } = await supabase
    .from("submission_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("submission_id", id)
    .maybeSingle()

  if (!document) {
    return { error: "Document not found." }
  }

  await supabase.storage.from("abstracts").remove([document.storage_path])
  const { error } = await supabase
    .from("submission_documents")
    .delete()
    .eq("id", documentId)
    .eq("submission_id", id)

  if (error) {
    return { error: "Could not remove the file. Please try again." }
  }

  return { success: true }
}

export async function submitAbstractAction(id: string): Promise<ActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()

  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  const [{ data: submission }, { data: version }, { data: documents }] = await Promise.all([
    supabase.from("submissions").select("*").eq("id", id).single(),
    supabase
      .from("submission_versions")
      .select("*")
      .eq("submission_id", id)
      .eq("version_number", draft.current_version)
      .single(),
    supabase.from("submission_documents").select("id").eq("submission_id", id).eq("is_current", true),
  ])

  if (!submission?.title || !submission.subtheme_id) {
    return { error: "Complete the abstract information step before submitting." }
  }
  if (!version?.abstract_text?.trim()) {
    return { error: "Add your abstract content before submitting." }
  }
  const conference = await getActiveConference()
  if (conference && version.word_count > conference.abstract_word_limit) {
    return { error: `Your abstract exceeds the ${conference.abstract_word_limit}-word limit.` }
  }
  if (
    !submission.no_conflict_of_interest ||
    !submission.ethical_approval_obtained ||
    !submission.originality_confirmed ||
    !submission.funding_declaration
  ) {
    return { error: "Complete all declarations before submitting." }
  }
  if (!documents || documents.length === 0) {
    return { error: "Upload your abstract document before submitting." }
  }

  const { error } = await supabase.rpc("submit_abstract", { p_submission_id: id })
  if (error) {
    return { error: "Your submission could not be completed. Please try again." }
  }

  const admin = createAdminClient()
  const { data: pendingNotifications } = await admin
    .from("notifications")
    .select("id")
    .eq("submission_id", id)
    .eq("status", "pending")
  if (pendingNotifications && pendingNotifications.length > 0) {
    const ids = pendingNotifications.map((n) => n.id)
    // Don't make the author wait on SMTP round trips (multiple recipients
    // can take 10s+ sequentially) -- send after the response is already on
    // its way, per Next.js's documented pattern for post-response work.
    after(() => sendNotifications(ids))
  }

  redirect(`/author/submissions/${id}?submitted=1`)
}

async function loadOwnRevisableSubmission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  authUserId: string
) {
  const { data } = await supabase
    .from("submissions")
    .select("id, corresponding_author_id, status, current_version")
    .eq("id", id)
    .single()

  if (!data || data.corresponding_author_id !== authUserId || data.status !== "revision_required") {
    return null
  }
  return data
}

export async function saveRevisionAction(id: string, input: Step3Input): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = step3Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const submission = await loadOwnRevisableSubmission(supabase, id, session.authUserId)
  if (!submission) {
    return { error: "This submission is not open for revision." }
  }

  const conference = await getActiveConference()
  const wordCount = countWords(parsed.data.abstractText)
  if (conference && wordCount > conference.abstract_word_limit) {
    return {
      error: `Your abstract is ${wordCount} words, over the ${conference.abstract_word_limit}-word limit.`,
    }
  }

  const { error } = await supabase.from("submission_versions").upsert(
    {
      submission_id: id,
      version_number: submission.current_version + 1,
      abstract_text: parsed.data.abstractText,
      word_count: wordCount,
    },
    { onConflict: "submission_id,version_number" }
  )

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  return { success: true }
}

export async function submitRevisionAction(id: string): Promise<ActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()

  const submission = await loadOwnRevisableSubmission(supabase, id, session.authUserId)
  if (!submission) {
    return { error: "This submission is not open for revision." }
  }

  const nextVersion = submission.current_version + 1
  const [{ data: version }, { data: documents }] = await Promise.all([
    supabase
      .from("submission_versions")
      .select("abstract_text, word_count")
      .eq("submission_id", id)
      .eq("version_number", nextVersion)
      .maybeSingle(),
    supabase.from("submission_documents").select("id").eq("submission_id", id).eq("is_current", true),
  ])

  if (!version?.abstract_text?.trim()) {
    return { error: "Add your revised abstract content before submitting." }
  }
  const conference = await getActiveConference()
  if (conference && version.word_count > conference.abstract_word_limit) {
    return { error: `Your abstract exceeds the ${conference.abstract_word_limit}-word limit.` }
  }
  if (!documents || documents.length === 0) {
    return { error: "Upload your revised abstract document before submitting." }
  }

  const { error } = await supabase.rpc("resubmit_abstract", { p_submission_id: id })
  if (error) {
    return { error: "Your revision could not be submitted. Please try again." }
  }

  const admin = createAdminClient()
  const { data: pendingNotifications } = await admin
    .from("notifications")
    .select("id")
    .eq("submission_id", id)
    .eq("status", "pending")
  if (pendingNotifications && pendingNotifications.length > 0) {
    const ids = pendingNotifications.map((n) => n.id)
    after(() => sendNotifications(ids))
  }

  redirect(`/author/submissions/${id}?submitted=1`)
}
