import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { sendMail } from "@/lib/email"
import { escapeHtml } from "@/lib/html"

// Sent when an admin creates a reviewer or committee-member account.
// Uses a Supabase recovery link (delivered through our own sendMail, not
// Supabase's built-in email) so the person sets their own password on
// first login instead of a raw temp password being relayed by hand.
export function accountWelcomeHtml(params: {
  firstName: string
  roleLabel: string
  actionLink: string
}) {
  const firstName = params.firstName.trim().split(/\s+/)[0] || params.firstName
  return `
    <h2>You've been added as a ${escapeHtml(params.roleLabel)}</h2>
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>An admin has created your ${escapeHtml(params.roleLabel)} account for the ASM Nigeria 2026
    Abstract Management System.</p>
    <p><a href="${params.actionLink}">Set your password and log in</a></p>
    <p>This link is single-use and expires after a short time. If it has expired, use
    "Forgot password?" on the login page with this email address to get a new one.</p>
    <p>— ASM Nigeria 2026 Admin</p>
  `
}

// Uses a recovery-type link rather than Supabase's own invite email: our
// /auth/confirm route explicitly keeps the session alive for type=recovery
// (needed so /reset-password can set the password) and signs out for any
// other type, including "invite" -- so recovery is the one that actually
// works with this app's existing reset-password page.
export async function sendAccountWelcomeEmail(params: {
  admin: SupabaseClient
  email: string
  firstName: string
  roleLabel: string
  origin: string
}): Promise<boolean> {
  const { data: linkData, error: linkError } = await params.admin.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: { redirectTo: `${params.origin}/reset-password` },
  })
  if (linkError || !linkData?.properties?.hashed_token) {
    return false
  }

  const actionLink = `${params.origin}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery&next=/reset-password`

  try {
    await sendMail({
      to: params.email,
      subject: `Your ASM Nigeria 2026 ${params.roleLabel} account`,
      html: accountWelcomeHtml({ firstName: params.firstName, roleLabel: params.roleLabel, actionLink }),
    })
    return true
  } catch {
    return false
  }
}
