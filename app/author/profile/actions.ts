"use server"

import { revalidatePath } from "next/cache"

import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { profileSchema, type ProfileInput } from "@/lib/validations/profile"

export type UpdateProfileResult = { error: string } | { success: true }

export async function updateProfileAction(input: ProfileInput): Promise<UpdateProfileResult> {
  const session = await requireAuth()

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const supabase = await createClient()
  const { error } = await supabase
    .from("user_profiles")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      professional_title: data.professionalTitle,
      institution: data.institution,
      department: data.department,
      country: data.country,
      phone: data.phone,
      orcid: data.orcid || null,
    })
    .eq("id", session.authUserId)

  if (error) {
    return { error: "Could not update your profile. Please try again." }
  }

  revalidatePath("/author/profile")
  return { success: true }
}
