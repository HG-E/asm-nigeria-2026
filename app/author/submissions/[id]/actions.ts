"use server"

import { redirect } from "next/navigation"

import { requireAuth } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
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
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
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
  documentId: string,
  storagePath: string
): Promise<ActionResult> {
  const session = await requireAuth()
  const supabase = await createClient()
  const draft = await loadOwnDraft(supabase, id, session.authUserId)
  if (!draft) {
    return { error: "This draft is no longer editable." }
  }

  await supabase.storage.from("abstracts").remove([storagePath])
  const { error } = await supabase.from("submission_documents").delete().eq("id", documentId)

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

  redirect(`/author/submissions/${id}?submitted=1`)
}
