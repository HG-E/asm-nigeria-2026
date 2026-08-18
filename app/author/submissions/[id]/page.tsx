import Link from "next/link"
import { notFound } from "next/navigation"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function SubmissionDetailPage(props: PageProps<"/author/submissions/[id]">) {
  const { id } = await props.params
  const session = await requireAuth()
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, conference_subthemes(name)")
    .eq("id", id)
    .eq("corresponding_author_id", session.authUserId)
    .maybeSingle()

  if (!submission) {
    notFound()
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{submission.title || "Untitled abstract"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Reference</dt>
          <dd>{submission.reference_number ?? "Not yet assigned (draft)"}</dd>
          <dt className="text-muted-foreground">Subtheme</dt>
          <dd>{submission.conference_subthemes?.name ?? "—"}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{submission.status}</dd>
        </dl>
        <p className="text-muted-foreground text-sm">
          Full submission detail view (authors, abstract, declarations,
          document, version history, review status) is coming with the
          submission form build-out.
        </p>
        <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </CardContent>
    </Card>
  )
}
