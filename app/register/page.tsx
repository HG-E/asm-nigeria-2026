import Link from "next/link"

import { RegisterForm } from "@/components/auth/register-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: conference } = await supabase
    .from("conferences")
    .select("tagline")
    .eq("is_active", true)
    .maybeSingle()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/30 px-4 py-12">
      {conference?.tagline && (
        <p className="text-muted-foreground text-center text-sm italic">
          &ldquo;{conference.tagline}&rdquo;
        </p>
      )}
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create an author account</CardTitle>
          <CardDescription>
            Register to submit and track abstracts for ASM Nigeria 2026.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
