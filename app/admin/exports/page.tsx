import { PageHeader } from "@/components/dashboard/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { bookReadiness, fetchBookEntries } from "@/lib/exports/book-of-abstracts"
import { EXPORT_DATASETS } from "@/lib/exports/datasets"
import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/lib/auth"
import { cn } from "@/lib/utils"

// A file download, not a page -- hence a plain anchor.
const BOOK_SLUG = "book-of-abstracts"

export default async function AdminExportsPage() {
  await requireRole("admin")
  const readiness = bookReadiness(await fetchBookEntries(await createClient()))

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exports"
        description="Download submission records for the Book of Abstracts, reviewer records, and conference reporting."
      />

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Book of Abstracts — collation plan</CardTitle>
          <CardDescription>
            Abstract submission closes <strong>Mon 2 Nov 2026</strong>. Accepted authors are asked to have their
            abstract in the four-part format by <strong>Fri 30 Oct</strong>. Start collating on{" "}
            <strong>Tue 3 Nov</strong>, freeze the set in mid-November, and print/upload before the conference
            (22–25 Nov). Download the Word file any time — it is a draft until nothing is outstanding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <strong>{readiness.ready}</strong> of <strong>{readiness.total}</strong> accepted abstracts are in the
            four-part format
            {readiness.outstanding.length > 0 ? ` — ${readiness.outstanding.length} still outstanding:` : " — ready to print."}
          </p>
          {readiness.outstanding.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-muted-foreground">
              {readiness.outstanding.map((o) => (
                <li key={o.reference}>
                  <span className="font-medium text-foreground">{o.reference}</span> — {o.author}
                  {o.missing ? " (abstract text missing)" : ""}
                </li>
              ))}
            </ul>
          )}
          <a
            href={`/admin/exports/${BOOK_SLUG}?format=docx`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Download Book of Abstracts (Word)
          </a>
        </CardContent>
      </Card>

      <div className="animate-in fade-in-0 slide-in-from-bottom-2 grid gap-4 duration-500 sm:grid-cols-2">
        {EXPORT_DATASETS.map((dataset) => (
          <Card key={dataset.slug} className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base">{dataset.label}</CardTitle>
              <CardDescription>{dataset.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <a
                href={`/admin/exports/${dataset.slug}?format=csv`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Download CSV
              </a>
              <a
                href={`/admin/exports/${dataset.slug}?format=xlsx`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Download XLSX
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
