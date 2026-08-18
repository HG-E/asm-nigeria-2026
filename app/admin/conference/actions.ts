"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import {
  conferenceSettingsSchema,
  type ConferenceSettingsInput,
} from "@/lib/validations/conference"

export type ActionResult = { error: string } | { success: true }

export async function updateConferenceAction(
  id: string,
  input: ConferenceSettingsInput
): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = conferenceSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from("conferences")
    .update({
      name: data.name,
      theme: data.theme || null,
      location: data.location,
      venue: data.venue || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      early_submission_deadline: data.earlySubmissionDeadline || null,
      late_submission_deadline: data.lateSubmissionDeadline || null,
      review_deadline: data.reviewDeadline || null,
      decision_date: data.decisionDate || null,
      abstract_word_limit: data.abstractWordLimit,
      max_file_size_mb: data.maxFileSizeMb,
      secretariat_email: data.secretariatEmail || null,
      website: data.website || null,
      submissions_open: data.submissionsOpen,
    })
    .eq("id", id)

  if (error) {
    return { error: "Could not save. Please try again." }
  }

  revalidatePath("/admin/conference")
  return { success: true }
}
