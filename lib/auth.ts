import "server-only"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

type UserRole = Database["public"]["Enums"]["user_role"]
type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]

export async function getCurrentUser(): Promise<{
  authUserId: string
  email: string
  profile: UserProfile
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return { authUserId: user.id, email: user.email ?? profile.email, profile }
}

export async function requireAuth() {
  const session = await getCurrentUser()
  if (!session) {
    redirect("/login")
  }
  return session
}

// Role hierarchy mirrors public.auth_has_role() in Postgres — this is a
// UX-layer guard only. RLS is the actual trust boundary.
const ROLE_RANK: Record<UserRole, number> = {
  author: 0,
  reviewer: 1,
  committee: 2,
  admin: 3,
  super_admin: 4,
}

export async function requireRole(minimumRole: UserRole) {
  const session = await requireAuth()
  if (ROLE_RANK[session.profile.role] < ROLE_RANK[minimumRole]) {
    redirect("/")
  }
  return session
}
