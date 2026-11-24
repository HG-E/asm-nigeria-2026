import Link from "next/link"

import { PageHeader } from "@/components/dashboard/page-header"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { fetchTrackingData, lookupScheduledSlot, lookupTrackedSubmission } from "@/lib/presentation-tracking"
import {
  ATTENDANCE_MODES,
  fetchFilteredSubmissions,
  PRESENTATION_TYPE_LABELS,
  PRESENTATION_TYPES,
  PRESENTER_EXPORT_COLUMNS,
  SORT_LABELS,
  SORTS,
  STATUS_BY_TYPE,
  type PresentationType,
  type Sort,
} from "@/lib/submissions-list"
import { createClient } from "@/lib/supabase/server"
import { RichText } from "@/components/submission/rich-text"
import { cn } from "@/lib/utils"

export default async function AdminPresentationsPage(props: PageProps<"/admin/presentations">) {
  await requireRole("admin")
  const searchParams = await props.searchParams
  const conference = await getActiveConference()
  const supabase = await createClient()

  const q = typeof searchParams.q === "string" ? searchParams.q : ""
  const type = PRESENTATION_TYPES.includes(searchParams.type as PresentationType) ? (searchParams.type as PresentationType) : ""
  const subtheme = typeof searchParams.subtheme === "string" ? searchParams.subtheme : ""
  const attendance = typeof searchParams.attendance === "string" ? searchParams.attendance : ""
  const sort: Sort = SORTS.includes(searchParams.sort as Sort) ? (searchParams.sort as Sort) : "date"

  const { data: subthemes } = await supabase
    .from("conference_subthemes")
    .select("id, name")
    .order("name", { ascending: true })

  // This page is scoped to approved presenters only -- everyone with a
  // final accepted_oral or accepted_poster decision -- never every
  // submission regardless of status, which is what /admin/submissions is
  // for. Narrowed further to just one type when the Type filter picks one.
  const statusList = type ? [STATUS_BY_TYPE[type]] : [STATUS_BY_TYPE.oral, STATUS_BY_TYPE.poster]

  const submissions = await fetchFilteredSubmissions(supabase, { q, statusList, subtheme, attendance, sort })

  const tracking = conference?.presentation_tracking_csv_url
    ? await fetchTrackingData(conference.presentation_tracking_csv_url)
    : null
  const trackingData = tracking && !("error" in tracking) ? tracking : null
  const trackingError = tracking && "error" in tracking ? tracking.error : null

  // Only oral presenters submit slides through this external form -- a
  // poster is presented physically, not uploaded here (see migration
  // 0039's comment), so a poster row's slide columns are "not applicable"
  // rather than "not yet submitted."
  const presenters = submissions.map((s) => ({
    ...s,
    track:
      trackingData && s.status === "accepted_oral"
        ? lookupTrackedSubmission(trackingData, s.reference_number, s.user_profiles?.email)
        : null,
    scheduled: lookupScheduledSlot(s.reference_number),
  }))

  const oralCount = presenters.filter((p) => p.status === "accepted_oral").length
  const submittedCount = trackingData ? presenters.filter((p) => p.status === "accepted_oral" && p.track).length : 0
  const scheduledCount = presenters.filter((p) => p.scheduled).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presentations"
        description="Approved presenters (oral and poster), with oral slide-deck submission status synced from the Google Form tracking sheet."
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
            Upload form is set, but no tracking sheet is connected yet, so oral slide-submission status below
            can&apos;t be checked automatically.{" "}
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

      {trackingData && (
        <p className="text-muted-foreground text-sm">
          {submittedCount} of {oralCount} oral presenters have submitted their slides.
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        {scheduledCount} of {presenters.length} currently shown have a confirmed schedule slot.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search &amp; Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap gap-3" method="get">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by title or reference number"
              className="max-w-sm flex-1"
            />
            <Select name="type" defaultValue={type}>
              <SelectTrigger className="w-40">
                <SelectValue>{type ? PRESENTATION_TYPE_LABELS[type] : "Oral + Poster"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Oral + Poster</SelectItem>
                {PRESENTATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PRESENTATION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="subtheme" defaultValue={subtheme}>
              <SelectTrigger className="w-56">
                <SelectValue>
                  {subtheme ? ((subthemes ?? []).find((s) => s.id === subtheme)?.name ?? "All subthemes") : "All subthemes"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All subthemes</SelectItem>
                {(subthemes ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="attendance" defaultValue={attendance}>
              <SelectTrigger className="w-44">
                <SelectValue>{attendance || "All attendance modes"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All attendance modes</SelectItem>
                {ATTENDANCE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="sort" defaultValue={sort}>
              <SelectTrigger className="w-48">
                <SelectValue>{`Sort: ${SORT_LABELS[sort]}`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Apply
            </Button>
            {(q || type || subtheme || attendance || sort !== "date") && (
              <Link href="/admin/presentations" className={cn(buttonVariants({ variant: "ghost" }))}>
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Presenters ({presenters.length})</CardTitle>
        </CardHeader>
        {presenters.length > 0 && (
          <CardContent className="border-b pb-6">
            {/* Plain native form (not the Select/Checkbox components used
                above, which render as buttons rather than real form inputs)
                so column selection works with a no-JS GET submission --
                same pattern as admin/submissions's download form. */}
            <form action="/admin/presentations/export" method="get" className="space-y-3">
              {q && <input type="hidden" name="q" value={q} />}
              {type && <input type="hidden" name="type" value={type} />}
              {subtheme && <input type="hidden" name="subtheme" value={subtheme} />}
              {attendance && <input type="hidden" name="attendance" value={attendance} />}
              {sort !== "date" && <input type="hidden" name="sort" value={sort} />}

              <div>
                <p className="mb-2 text-sm font-medium">Columns to include</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {PRESENTER_EXPORT_COLUMNS.map((c) => (
                    <label key={c.key} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="columns" value={c.key} defaultChecked className="size-4" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" name="format" value="csv" variant="outline" size="sm">
                  Download CSV
                </Button>
                <Button type="submit" name="format" value="xlsx" variant="outline" size="sm">
                  Download Excel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent className="px-0 sm:px-6">
          {presenters.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No approved presenters match your search.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Presenter</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Slide Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presenters.map((p) => {
                  const isOral = p.status === "accepted_oral"
                  const submitted = Boolean(p.track)
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
                      <TableCell className="text-sm">{p.conference_subthemes?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={isOral ? "gold" : "secondary"}>{isOral ? "Oral" : "Poster"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.attendanceMode ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {p.scheduled ? (
                          <>
                            <div>{p.scheduled.day}</div>
                            <div className="text-muted-foreground text-xs">{p.scheduled.time}</div>
                          </>
                        ) : (
                          <Badge variant="destructive">Not scheduled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isOral ? (
                          <span className="text-muted-foreground text-sm">N/A (poster)</span>
                        ) : trackingData ? (
                          <Badge variant={submitted ? "gold" : "secondary"}>{submitted ? "Submitted" : "Not yet"}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{p.track?.timestamp ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {p.track?.fileLink ? (
                          <Link
                            href={p.track.fileLink}
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
