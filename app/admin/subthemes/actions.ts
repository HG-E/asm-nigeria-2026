"use server"

import { revalidatePath } from "next/cache"

import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createClient } from "@/lib/supabase/server"
import { subthemeSchema, type SubthemeInput } from "@/lib/validations/subtheme"

export type ActionResult = { error: string } | { success: true }

export async function updateSubthemeAction(id: string, input: SubthemeInput): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = subthemeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("conference_subthemes")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      code: parsed.data.code,
      is_active: parsed.data.isActive,
    })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") {
      return { error: "This code is already used by another subtheme." }
    }
    return { error: "Could not save. Please try again." }
  }

  revalidatePath("/admin/subthemes")
  return { success: true }
}

export async function createSubthemeAction(input: SubthemeInput): Promise<ActionResult> {
  await requireRole("admin")
  const parsed = subthemeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const conference = await getActiveConference()
  if (!conference) {
    return { error: "No active conference is configured." }
  }

  const supabase = await createClient()
  const { count } = await supabase
    .from("conference_subthemes")
    .select("id", { count: "exact", head: true })
    .eq("conference_id", conference.id)

  const { error } = await supabase.from("conference_subthemes").insert({
    conference_id: conference.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    code: parsed.data.code,
    is_active: parsed.data.isActive,
    sort_order: (count ?? 0) + 1,
  })

  if (error) {
    if (error.code === "23505") {
      return { error: "This code is already used by another subtheme." }
    }
    return { error: "Could not create. Please try again." }
  }

  revalidatePath("/admin/subthemes")
  return { success: true }
}
