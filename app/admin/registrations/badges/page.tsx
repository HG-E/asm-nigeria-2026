import { PrintButton } from "@/components/admin/print-button"
import { RegistrationBadge } from "@/components/admin/registration-badge"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { buttonVariants } from "@/components/ui/button"
import { requireRole } from "@/lib/auth"
import { buildRegistrationFileUrls } from "@/lib/registration-file-urls"
import { generateQrDataUrl } from "@/lib/registration-qr"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { watDateTimeToUtcIso } from "@/lib/wat-date"

// The printed badge shows a short ID (just the trailing number), matching
// the template's original single-digit placeholder -- the full reference
// number would overflow that space. The QR still encodes the complete
// reference number, so scanning is unaffected either way.
function shortRegistrationId(referenceNumber: string | null): string {
  if (!referenceNumber) return "—"
  const match = referenceNumber.match(/(\d+)$/)
  return match ? match[1] : referenceNumber
}

export default async function RegistrationBadgesPage(props: PageProps<"/admin/registrations/badges">) {
  await requireRole("admin")
  const searchParams = await props.searchParams

  const from = typeof searchParams.from === "string" ? searchParams.from : ""
  const to = typeof searchParams.to === "string" ? searchParams.to : ""
  const fromIso = watDateTimeToUtcIso(from, false)
  const toIso = watDateTimeToUtcIso(to, true)

  const supabase = await createClient()
  let query = supabase
    .from("conference_registrations")
    .select(
      "id, full_name, institution, reference_number, passport_photo_path, payment_receipt_path, asm_certificate_path"
    )
    .order("created_at")

  if (fromIso) query = query.gte("created_at", fromIso)
  if (toIso) query = query.lte("created_at", toIso)

  const { data } = await query
  const registrations = data ?? []

  const fileUrls = await buildRegistrationFileUrls(createAdminClient(), registrations)
  const qrDataUrls = await Promise.all(
    registrations.map((r) => (r.reference_number ? generateQrDataUrl(r.reference_number) : Promise.resolve(null)))
  )

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .badge-print-grid { display: block !important; }
          .badge-card { page-break-after: always; width: 3.5in !important; margin: 0 auto; }
        }
      `}</style>

      <PageHeader title="Print Badges" description="Generate printable event badges with each registrant's photo, name and check-in QR." />

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="badges-from">
                Registered from
              </label>
              <Input id="badges-from" type="datetime-local" name="from" defaultValue={from} className="w-56" />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs" htmlFor="badges-to">
                Registered to
              </label>
              <Input id="badges-to" type="datetime-local" name="to" defaultValue={to} className="w-56" />
            </div>
            <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Apply
            </button>
            {(from || to) && (
              <a href="/admin/registrations/badges" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                Clear
              </a>
            )}
            <PrintButton />
          </form>
          <p className="text-muted-foreground text-xs">
            Leave both blank for everyone. To match registrations on or before a given date, leave &quot;Registered
            from&quot; blank and set &quot;Registered to&quot; to that date.
          </p>
        </CardContent>
      </Card>

      <p className="no-print text-muted-foreground text-sm">
        {registrations.length} registrant{registrations.length === 1 ? "" : "s"} match{registrations.length === 1 ? "es" : ""} this filter.
      </p>

      <div className="badge-print-grid grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {registrations.map((r, i) => (
          <div key={r.id}>
            <RegistrationBadge
              photoUrl={fileUrls.get(r.id)?.photo ?? null}
              fullName={r.full_name}
              affiliation={r.institution}
              registrationId={shortRegistrationId(r.reference_number)}
              qrDataUrl={qrDataUrls[i] ?? ""}
            />
          </div>
        ))}
        {registrations.length === 0 && (
          <p className="text-muted-foreground col-span-full py-8 text-center text-sm">
            No registrants match this filter.
          </p>
        )}
      </div>
    </div>
  )
}
