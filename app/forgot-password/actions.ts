"use server"

import { headers } from "next/headers"

import { sendMail } from "@/lib/email"
import { wrapEmailHtml } from "@/lib/notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"

// Same reasoning as app/register/actions.ts: the reset email is generated
// and sent through the project's own Gmail SMTP instead of
// supabase.auth.resetPasswordForEmail(), which hands it to Supabase's
// built-in sender -- the one with the low default rate limit that was
// blocking new sign-ups. generateLink never reveals whether an email is
// registered on its own; "user_not_found" is caught here and swallowed so
// this action keeps that same guarantee.
export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<{ ok: true }> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: true }
  }

  const admin = createAdminClient()
  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.asmnigeriaconference.com.ng"

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: { redirectTo: `${origin}/reset-password` },
  })

  if (error || !data.properties?.action_link) {
    return { ok: true }
  }

  const firstName = (data.user?.user_metadata as { first_name?: string } | null)?.first_name
  try {
    await sendMail({
      to: parsed.data.email,
      subject: "Reset your password — ASM Nigeria 2026",
      html: wrapEmailHtml(`
        <p style="margin-top:0;">Dear ${firstName || "Colleague"},</p>
        <p>We received a request to reset your password for the ASM Nigeria 2026 Abstract Management System. Click below to set a new one:</p>
        <p style="text-align:center; margin:28px 0;">
          <a href="${data.properties.action_link}" style="display:inline-block; background:#003087; color:#ffffff; font-weight:bold; text-decoration:none; padding:12px 28px; border-radius:6px; font-size:14px;">Reset my password</a>
        </p>
        <p style="color:#5b6472; font-size:13px;">If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break:break-all;">${data.properties.action_link}</span></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `),
    })
  } catch (mailError) {
    console.error("[forgotPasswordAction] reset email failed to send:", mailError)
    // Still report ok -- revealing a send failure here would reveal that
    // the email is registered, the exact thing this action must not do.
  }

  return { ok: true }
}
