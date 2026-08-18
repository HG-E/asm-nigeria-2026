import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuth } from "@/lib/auth"

export default async function NewSubmissionPage() {
  await requireAuth()

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Submit a new abstract</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          The multi-step abstract submission form (subtheme selection,
          co-authors, content with live word count, declarations, document
          upload, and review) is next up.
        </p>
        <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </CardContent>
    </Card>
  )
}
