"use server"

import { headers } from "next/headers"

import { createClient } from "@/lib/supabase/server"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"

export type RegisterResult = { error: string } | { success: true }

export async function registerAction(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const data = parsed.data

  const supabase = await createClient()
  const originHeader = (await headers()).get("origin")
  const origin = originHeader ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  const { data: signUpData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${origin}/login?verified=1`,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        professional_title: data.professionalTitle,
        institution: data.institution,
        department: data.department,
        country: data.country,
        phone: data.phone,
        orcid: data.orcid || null,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // With email confirmation required, signing up an already-registered
  // email returns a user with no identities instead of an error.
  if (signUpData.user && signUpData.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Try logging in instead." }
  }

  return { success: true }
}
