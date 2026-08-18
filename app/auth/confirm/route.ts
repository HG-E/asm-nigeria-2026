import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/login"

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      // Password recovery needs the session verifyOtp just created so the
      // user can set a new password on the next page. Everything else
      // (signup confirmation) follows the spec's explicit
      // register -> verify -> log in flow, so sign back out.
      if (type !== "recovery") {
        await supabase.auth.signOut()
      }
      redirect(next)
    }
  }

  redirect("/auth/auth-code-error")
}
