"use server"

import { randomBytes } from "node:crypto"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createAdminClient } from "@/lib/supabase/admin"
import { addReviewerSchema, type AddReviewerInput } from "@/lib/validations/reviewer"

function generateTempPassword() {
  return `Asm${randomBytes(9).toString("base64url")}!`
}

export type AddReviewerResult =
  | { error: string }
  | { success: true; tempPassword: string }
  | { success: true; reusedExistingAccount: true }

export async function addReviewerAction(input: AddReviewerInput): Promise<AddReviewerResult> {
  await requireRole("admin")

  const parsed = addReviewerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "No active conference is configured." }
  }

  const admin = createAdminClient()

  // A reviewer covering more than one subtheme gets a second (or further)
  // reviewer_profiles row for the same account instead of a duplicate
  // account -- add them straight to the new subtheme.
  const { data: existingProfile } = await admin
    .from("user_profiles")
    .select("id, role")
    .eq("email", data.email)
    .maybeSingle()

  if (existingProfile) {
    if (existingProfile.role !== "reviewer") {
      return { error: "A user with this email already exists with a different role." }
    }

    const { error: profileError } = await admin.from("reviewer_profiles").insert({
      user_id: existingProfile.id,
      conference_id: conference.id,
      subtheme_id: data.subthemeId,
      expertise: data.expertise || null,
      is_active: true,
    })

    if (profileError) {
      if (profileError.code === "23505") {
        return { error: "This reviewer is already assigned to this subtheme." }
      }
      return { error: "Could not add this subtheme to the reviewer. Please try again." }
    }

    revalidatePath("/admin/reviewers")
    return { success: true, reusedExistingAccount: true }
  }

  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: data.firstName,
      last_name: data.lastName,
      asm_id_number: data.asmIdNumber || "",
      role: "reviewer",
      institution: data.institution,
    },
  })

  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return { error: "A user with this email already exists." }
    }
    return { error: "Could not create the reviewer account. Please try again." }
  }

  const { error: profileError } = await admin.from("reviewer_profiles").insert({
    user_id: created.user.id,
    conference_id: conference.id,
    subtheme_id: data.subthemeId,
    expertise: data.expertise || null,
    is_active: true,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: "Could not create the reviewer profile. Please try again." }
  }

  revalidatePath("/admin/reviewers")
  return { success: true, tempPassword }
}

export async function toggleReviewerActiveAction(
  reviewerProfileId: string,
  isActive: boolean
): Promise<{ error: string } | { success: true }> {
  await requireRole("admin")

  const admin = createAdminClient()
  const { error } = await admin
    .from("reviewer_profiles")
    .update({ is_active: isActive })
    .eq("id", reviewerProfileId)

  if (error) {
    return { error: "Could not update the reviewer. Please try again." }
  }

  revalidatePath("/admin/reviewers")
  return { success: true }
}
