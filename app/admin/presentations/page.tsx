import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { findColumn, parseCsvRecords } from "@/lib/parse-csv"
import { createClient } from "@/lib/supabase/server"
import { RichText } from "@/components/submission/rich-text"
import { cn } from "@/lib/utils"

// Reference numbers are typed by hand into the Google Form, so matching has
// to tolerate whitespace and case differences a human would introduce --
// normalize both sides the same way before comparing.
function normalizeRef(ref: string): string {
  return ref.trim().toUpperCase()
}

type SubmissionRecord = {
  timestamp: string | null
  fileLink: string | null
}

async function fetchTrackingData(csvUrl: string): Promise<Map<string, SubmissionRecord> | { error: string }> {
  let response: Response
  try {
    response = await fetch(csvUrl, { cache: "no-store" })
  } catch {
    return { error: "Could not reach that URL. Check it's the published CSV link, not the normal sheet link." }
  }
  if (!response.ok) {
    return { error: `The tracking sheet URL returned an error (HTTP ${response.status}). Check it's still published.` }
  }

  const text = await response.text()
  const records = parseCsvRecords(text)
  const map = new Map<string, SubmissionRecord>()

  for (const record of records) {
    const refColumn = findColumn(record, ["reference"])
    if (!refColumn) continue
    const ref = normalizeRef(record[refColumn])
    if (!ref) continue

    const fileColumn = findColumn(record, ["file", "drive", "presentation", "upload"])
    const timestampColumn = findColumn(record, ["timestamp"])

    map.set(ref, {
      timestamp: timestampColumn ? record[timestampColumn] || null : null,
      fileLink: fileColumn ? record[fileColumn] || null : null,
    })
  }

  return map
}

export default async function AdminPresentationsPage() {
  await requireRole("admin")
  const conference = await getActiveConference()
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, reference_number, title, user_profiles:corresponding_author_id(first_name, last_name, email)"
    )
    .eq("status", "accepted_oral")
    .order("reference_number")

  const presenters = submissions ?? []

  const tracking = conference?.presentation_tracking_csv_url
    ? await fetchTrackingData(conference.presentation_tracking_csv_url)
    : null
  const trackingMap = tracking && !("error" in tracking) ? tracking : null
  const trackingError = tracking && "error" in tracking ? tracking.error : null

  const submittedCount = trackingMap
    ? presenters.filter((p) => p.reference_number && trackingMap.has(normalizeRef(p.reference_number))).length
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presentations"
        description="Oral presenters' slide-deck submission status, synced from the Google Form tracking sheet."
      />

      {!conference?.presentation_upload_form_url && (
        <Alert variant="destructive">
          <AlertDescription>
            No presentation upload form is configured yet.{" "}
            <Link href="/admin/conference" className="underline underline-offset-4">
              Set one up in Conference Settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {conference?.presentation_upload_form_url && !conference?.presentation_tracking_csv_url && (
        <Alert>
          <AlertDescription>
            Upload form is set, but no tracking sheet is connected yet, so submission status below can&apos;t be
            checked automatically.{" "}
            <Link href="/admin/conference" className="underline underline-offset-4">
              Connect the published CSV link in Conference Settings
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {trackingError && (
        <Alert variant="destructive">
          <AlertDescription>{trackingError}</AlertDescription>
        </Alert>
      )}

      {trackingMap && (
        <p className="text-muted-foreground text-sm">
          {submittedCount} of {presenters.length} oral presenters have submitted their slides.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accepted Oral Presenters ({presenters.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {presenters.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No oral presentations have been accepted yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Presenter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presenters.map((p) => {
                  const record = p.reference_number && trackingMap ? trackingMap.get(normalizeRef(p.reference_number)) : null
                  const submitted = Boolean(record)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="bg-card sticky left-0 z-10 border-r font-mono text-xs">
                        {p.reference_number ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <RichText value={p.title} fallback="Untitled" />
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.user_profiles ? `${p.user_profiles.first_name} ${p.user_profiles.last_name}` : "—"}
                        <div className="text-muted-foreground text-xs">{p.user_profiles?.email}</div>
                      </TableCell>
                      <TableCell>
                        {trackingMap ? (
                          <Badge variant={submitted ? "gold" : "secondary"}>
                            {submitted ? "Submitted" : "Not yet"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{record?.timestamp ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {record?.fileLink ? (
                          <Link
                            href={record.fileLink}
                            target="_blank"
                            rel="noreferrer"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                          >
                            Open
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
