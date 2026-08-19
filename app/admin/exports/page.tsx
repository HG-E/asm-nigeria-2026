import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EXPORT_DATASETS } from "@/lib/exports/datasets"
import { requireRole } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default async function AdminExportsPage() {
  await requireRole("admin")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Exports</h1>
        <p className="text-muted-foreground text-sm">
          Download submission records for the Book of Abstracts, reviewer records, and
          conference reporting.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {EXPORT_DATASETS.map((dataset) => (
          <Card key={dataset.slug}>
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
