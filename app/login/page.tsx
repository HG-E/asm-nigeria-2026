import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"
import { BrandMark } from "@/components/layout/brand-mark"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const verified = searchParams.verified === "1"
  const reset = searchParams.reset === "1"

  const supabase = await createClient()
  const { data: conference } = await supabase
    .from("conferences")
    .select("tagline")
    .eq("is_active", true)
    .maybeSingle()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <BrandMark height={40} />
      {conference?.tagline && (
        <p className="text-muted-foreground text-center text-sm italic">
          &ldquo;{conference.tagline}&rdquo;
        </p>
      )}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Log in</CardTitle>
          <CardDescription>ASM Nigeria 2026 Abstract Management System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {verified && (
            <Alert>
              <AlertDescription>
                Email confirmed. You can now log in.
              </AlertDescription>
            </Alert>
          )}
          {reset && (
            <Alert>
              <AlertDescription>
                Password updated. Log in with your new password.
              </AlertDescription>
            </Alert>
          )}
          <LoginForm />
          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-foreground underline underline-offset-4">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
