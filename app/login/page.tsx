import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "Log In | ASM Nigeria 2026",
  description: "Log in to the ASM Nigeria 2026 Abstract Management System.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
}

const DASHBOARD_BY_ROLE: Record<string, string> = {
  author: "/author/dashboard",
  reviewer: "/reviewer/dashboard",
  committee: "/committee/dashboard",
  admin: "/admin/dashboard",
  super_admin: "/admin/dashboard",
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const verified = searchParams.verified === "1"
  const reset = searchParams.reset === "1"

  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (userData.user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single()
    const dashboard = DASHBOARD_BY_ROLE[profile?.role ?? "author"] ?? "/author/dashboard"

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
        <BrandMark height={40} />
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">You are already logged in</CardTitle>
            <CardDescription>{userData.user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href={dashboard}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-9 w-full items-center justify-center rounded-md text-sm font-medium transition-colors"
            >
              Go to my dashboard
            </Link>
            <p className="text-muted-foreground text-center text-sm">
              Not you?{" "}
              <Link href="/logout" className="text-foreground underline underline-offset-4">
                Log out
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
