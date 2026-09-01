"use server"

import { randomBytes } from "node:crypto"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { sendAccountWelcomeEmail } from "@/lib/account-email"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  addRegistrationDeskMemberSchema,
  type AddRegistrationDeskMemberInput,
} from "@/lib/validations/registration-desk"

function generateTempPassword() {
  return `Asm${randomBytes(9).toString("base64url")}!`
}

export type AddRegistrationDeskMemberResult = { error: string } | { success: true; emailSent: boolean }

export async function addRegistrationDeskMemberAction(
  input: AddRegistrationDeskMemberInput
): Promise<AddRegistrationDeskMemberResult> {
  await requireRole("admin")

  const parsed = addRegistrationDeskMemberSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: data.firstName,
      last_name: data.lastName,
      role: "registration_desk",
      institution: data.institution || "",
    },
  })

  if (createError || !created.user) {
    if (createError?.code === "email_exists") {
      return { error: "A user with this email already exists." }
    }
    return { error: "Could not create the registration desk account. Please try again." }
  }

  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const emailSent = await sendAccountWelcomeEmail({
    admin,
    email: data.email,
    firstName: data.firstName,
    roleLabel: "registration desk",
    origin,
  })

  revalidatePath("/admin/registration-desk")
  return { success: true, emailSent }
}