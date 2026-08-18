"use server"

import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<{ ok: true }> {
  const parsed = forgotPasswordSchema.safeParse(input)
  // Always report success even on invalid/unknown email — do not reveal
  // whether an email address is registered.
  if (!parsed.success) {
    return { ok: true }
  }

  const supabase = await createClient()
  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  })

  return { ok: true }
}
