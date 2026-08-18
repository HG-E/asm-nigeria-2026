"use server"

import { redirect } from "next/navigation"

import { getActiveConference } from "@/lib/conference"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { step1Schema, type Step1Input } from "@/lib/validations/submission"

export type CreateDraftResult = { error: string } | { success: true }

export async function createDraftAction(input: Step1Input): Promise<CreateDraftResult> {
  const session = await requireAuth()

  const parsed = step1Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "No active conference is configured. Contact the secretariat." }
  }

  const supabase = await createClient()

  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      conference_id: conference.id,
      corresponding_author_id: session.authUserId,
      subtheme_id: data.subthemeId,
      title: data.title,
      keywords: data.keywords,
      presentation_preference: data.presentationPreference,
      status: "draft",
    })
    .select("id")
    .single()

  if (error || !submission) {
    return { error: "Could not create the draft. Please try again." }
  }

  const { profile } = session
  const { error: authorError } = await supabase.from("submission_authors").insert({
    submission_id: submission.id,
    author_order: 1,
    is_corresponding: true,
    first_name: profile.first_name,
    last_name: profile.last_name,
    institution: profile.institution ?? "",
    department: profile.department ?? "",
    country: profile.country ?? "",
    email: profile.email,
    orcid: profile.orcid,
  })

  if (authorError) {
    return { error: "Could not create the draft. Please try again." }
  }

  redirect(`/author/submissions/${submission.id}?step=2`)
}
