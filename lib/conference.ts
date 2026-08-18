import "server-only"

import { createClient } from "@/lib/supabase/server"

// Single active conference for now (multi-conference support exists in the
// schema -- conferences.is_active -- but there's only ever one live
// conference to submit to at a time).
export async function getActiveConference() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("conferences")
    .select("*, conference_subthemes(*)")
    .eq("is_active", true)
    .single()

  if (!data) return null

  return {
    ...data,
    conference_subthemes: data.conference_subthemes
      .filter((s) => s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
  }
}
