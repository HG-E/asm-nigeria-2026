"use server"

import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export type LoginResult = { error: string } | { success: true; redirectTo: string }

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please verify your email address before logging in." }
    }
    return { error: "Incorrect email or password." }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single()

  const redirectTo =
    {
      author: "/author/dashboard",
      reviewer: "/reviewer/dashboard",
      committee: "/committee/dashboard",
      admin: "/admin/dashboard",
      super_admin: "/admin/dashboard",
    }[profile?.role ?? "author"] ?? "/author/dashboard"

  return { success: true, redirectTo }
}
