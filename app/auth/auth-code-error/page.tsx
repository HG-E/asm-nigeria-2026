import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Link expired or invalid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            This confirmation link is no longer valid. It may have already
            been used or expired. Try requesting a new one.
          </p>
          <div className="flex gap-2">
            <Link href="/login" className={buttonVariants({ variant: "outline", className: "flex-1" })}>
              Log in
            </Link>
            <Link href="/forgot-password" className={buttonVariants({ className: "flex-1" })}>
              Reset password
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
