"use server"

import { headers } from "next/headers"

import { buildConfirmLink } from "@/lib/auth-links"
import { sendMail } from "@/lib/email"
import { wrapEmailHtml } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"

export type RegisterResult = { error: string } | { success: true }

// Confirmation emails are generated and sent here (via the project's own
// Gmail SMTP, lib/email.ts) rather than through supabase.auth.signUp(),
// which hands the email off to Supabase's own built-in sender. That built-in
// sender has a very low default rate limit meant to be replaced by a real
// SMTP provider for production -- with several authors registering close
// together near the submission deadline, it returned "email rate limit
// exceeded" and silently blocked sign-ups. supabase.auth.admin.generateLink
// creates/updates the user and returns the confirmation link without
// sending anything itself, so the email goes out the same reliable path
// every other email in this app already uses.
export async function registerAction(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const admin = createAdminClient()
  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.asmnigeriaconference.com.ng"

  const metadata = {
    first_name: data.firstName,
    last_name: data.lastName,
    asm_id_number: data.asmIdNumber || "",
    professional_title: data.professionalTitle,
    institution: data.institution,
    department: data.department,
    country: data.country,
    phone: data.phone,
    orcid: data.orcid || null,
  }

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email: data.email,
    password: data.password,
    options: { data: metadata },
  })

  if (error) {
    if (error.code === "email_exists") {
      return { error: "An account with this email already exists. Try logging in instead." }
    }
    return { error: "Could not create your account. Please try again." }
  }

  // A second attempt with the same not-yet-confirmed email (e.g. the first
  // one was mistyped, or just never arrived) reaches this same branch --
  // generateLink alone doesn't actually change the stored password or
  // profile details on a repeat call, so without this explicit update the
  // account would silently keep the first attempt's password while the
  // author goes on to use whatever they typed the second time.
  if (!linkData.user.email_confirmed_at) {
    await admin.auth.admin.updateUserById(linkData.user.id, {
      password: data.password,
      user_metadata: metadata,
    })
    // updateUserById only touches auth.users -- the public.user_profiles
    // row (what every dashboard, count and listing in this app actually
    // reads) is populated by a database trigger that fires once, on the
    // original signup INSERT, and never again. Without this, a retry's
    // corrected name/institution/department would update auth metadata
    // and the password, but the profile everyone else sees would silently
    // keep stuck on the first attempt's (possibly wrong) details. Checked
    // directly against the database before shipping, not assumed.
    await admin
      .from("user_profiles")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        asm_id_number: data.asmIdNumber || "",
        professional_title: data.professionalTitle,
        institution: data.institution,
        department: data.department,
        country: data.country,
        phone: data.phone,
        orcid: data.orcid || null,
      })
      .eq("id", linkData.user.id)
  }

  const actionLink = buildConfirmLink(
    origin,
    linkData.properties.hashed_token,
    linkData.properties.verification_type,
    "/login?verified=1"
  )
  try {
    await sendMail({
      to: data.email,
      subject: "Confirm your email — ASM Nigeria 2026",
      html: wrapEmailHtml(`
        <p style="margin-top:0;">Dear ${data.firstName || "Colleague"},</p>
        <p>Thank you for registering for the ASM Nigeria 2026 Abstract Management System. Please confirm your email address to activate your account:</p>
        <p style="text-align:center; margin:28px 0;">
          <a href="${actionLink}" style="display:inline-block; background:#003087; color:#ffffff; font-weight:bold; text-decoration:none; padding:12px 28px; border-radius:6px; font-size:14px;">Confirm my email</a>
        </p>
        <p style="color:#5b6472; font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break:break-all;">${actionLink}</span></p>
        <p>Once confirmed, you can log in and submit your abstract.</p>
      `),
    })
  } catch (mailError) {
    console.error("[registerAction] confirmation email failed to send:", mailError)
    return {
      error:
        "Your account was created, but the confirmation email could not be sent. Please contact the secretariat at asmnigeriaonehealth@gmail.com for help.",
    }
  }

  return { success: true }
}
