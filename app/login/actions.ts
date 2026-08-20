"use server"

import { headers } from "next/headers"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export type LoginResult = { error: string } | { success: true; redirectTo: string }

const IP_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const IP_MAX_FAILED_ATTEMPTS = 10

async function getClientIp(): Promise<string | null> {
  const headerList = await headers()
  const forwardedFor = headerList.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || null
  return headerList.get("x-real-ip")
}

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const admin = createAdminClient()
  const ip = await getClientIp()

  if (ip) {
    const { count } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", new Date(Date.now() - IP_WINDOW_MS).toISOString())
    if ((count ?? 0) >= IP_MAX_FAILED_ATTEMPTS) {
      return { error: "Too many failed login attempts. Please wait 15 minutes and try again." }
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    await admin.from("login_attempts").insert({ ip_address: ip, email: parsed.data.email })
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
