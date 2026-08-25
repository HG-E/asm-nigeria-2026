"use server"

import { randomBytes } from "node:crypto"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { sendAccountWelcomeEmail } from "@/lib/account-email"
import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  addCommitteeMemberSchema,
  type AddCommitteeMemberInput,
} from "@/lib/validations/committee"

function generateTempPassword() {
  return `Asm${randomBytes(9).toString("base64url")}!`
}

export type AddCommitteeMemberResult = { error: string } | { success: true; emailSent: boolean }

export async function addCommitteeMemberAction(
  input: AddCommitteeMemberInput
): Promise<AddCommitteeMemberResult> {
  await requireRole("admin")

  const parsed = addCommitteeMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "No active conference is configured." }
  }

  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: data.firstName,
      last_name: data.lastName,
      asm_id_number: data.asmIdNumber || "",
      role: "committee",
      institution: data.institution,
    },
  })

  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return { error: "A user with this email already exists." }
    }
    return { error: "Could not create the committee member account. Please try again." }
  }

  const { error: memberError } = await admin.from("committee_members").insert({
    user_id: created.user.id,
    conference_id: conference.id,
    title: data.title || null,
    is_active: true,
  })

  if (memberError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: "Could not create the committee member. Please try again." }
  }

  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const emailSent = await sendAccountWelcomeEmail({
    admin,
    email: data.email,
    firstName: data.firstName,
    roleLabel: "committee member",
    origin,
  })

  revalidatePath("/admin/committee")
  return { success: true, emailSent }
}

export async function toggleCommitteeMemberActiveAction(
  memberId: string,
  isActive: boolean
): Promise<{ error: string } | { success: true }> {
  await requireRole("admin")

  const admin = createAdminClient()
  const { error } = await admin
    .from("committee_members")
    .update({ is_active: isActive })
    .eq("id", memberId)

  if (error) {
    return { error: "Could not update the committee member. Please try again." }
  }

  revalidatePath("/admin/committee")
  return { success: true }
}
