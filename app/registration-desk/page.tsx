import Link from "next/link"
import { CheckCheck, Clock, Layers, UserCheck, XCircle } from "lucide-react"

import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard, StatGrid, type StatAccent } from "@/components/dashboard/stat-card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { requireRegistrationAccess } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const STATUSES = ["pending", "verified", "rejected"] as const

function statusVariant(status: string): "gold" | "secondary" | "destructive" {
  if (status === "verified") return "gold"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export default async function RegistrationDeskPage(props: PageProps<"/registration-desk">) {
  await requireRegistrationAccess()
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const q = typeof searchParams.q === "string" ? searchParams.q : ""
  const status = typeof searchParams.status === "string" ? searchParams.status : ""

  let query = supabase
    .from("conference_registrations")
    .select("*")
    .order("created_at", { ascending: false })

  if (status) query = query.eq("payment_status", status)
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,reference_number.ilike.%${q}%`)

  const { data: registrations } = await query

  // registration-receipts has no storage.objects RLS policies at all (by
  // design -- every access, write or read, goes through the service-role
  // client). The regular session-bound client used for the row query above
  // can't sign URLs against it, so this specifically needs the admin client.
  const storageAdmin = createAdminClient()
  type FileLinks = { receipt: string | null; photo: string | null; certificate: string | null }
  const fileUrls = new Map<string, FileLinks>()
  async function signedUrl(path: string | null) {
    if (!path) return null
    const { data } = await storageAdmin.storage.from("registration-receipts").createSignedUrl(path, 60 * 10)
    return data?.signedUrl ?? null
  }
  for (const r of registrations ?? []) {
    fileUrls.set(r.id, {
      receipt: await signedUrl(r.payment_receipt_path),
      photo: await signedUrl(r.passport_photo_path),
      certificate: await signedUrl(r.asm_certificate_path),
    })
  }

  const counts = {
    total: registrations?.length ?? 0,
    pending: registrations?.filter((r) => r.payment_status === "pending").length ?? 0,
    verified: registrations?.filter((r) => r.payment_status === "verified").length ?? 0,
    rejected: registrations?.filter((r) => r.payment_status === "rejected").length ?? 0,
    attended: registrations?.filter((r) => r.attended).length ?? 0,
  }

  const summary: { label: string; value: number; icon: typeof Layers; accent: StatAccent }[] = [
    { label: "Total", value: counts.total, icon: Layers, accent: "muted" },
    { label: "Pending", value: counts.pending, icon: Clock, accent: "gold" },
    { label: "Verified", value: counts.verified, icon: CheckCheck, accent: "gold" },
    { label: "Rejected", value: counts.rejected, icon: XCircle, accent: "red" },
    { label: "Attended", value: counts.attended, icon: UserCheck, accent: "blue" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conference Registrations"
        description="All conference attendance registrations."
        actions={
          <>
            <Link href="/registration-desk/export?format=csv" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Download CSV
            </Link>
            <Link href="/registration-desk/export?format=xlsx" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Download XLSX
            </Link>
          </>
        }
      />

      <StatGrid>
        {summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
        ))}
      </StatGrid>

      <form className="flex flex-wrap gap-3">
        <Input name="q" placeholder="Search name, email, or reference" defaultValue={q} className="max-w-xs" />
        <Select name="status" defaultValue={status || "all"}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(registrations ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.reference_number ?? "—"}</TableCell>
                  <TableCell>
                    <div>{r.full_name}</div>
                    <div className="text-muted-foreground text-xs">{r.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.participant_category}
                    <span className="text-muted-foreground"> ({r.registration_period})</span>
                    <div className="text-muted-foreground text-xs">{r.attendance_mode}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.amount_expected}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col gap-1">
                      {(["receipt", "photo", "certificate"] as const).map((kind) => {
                        const url = fileUrls.get(r.id)?.[kind]
                        const label = kind === "receipt" ? "Receipt" : kind === "photo" ? "Photo" : "Certificate"
                        return url ? (
                          <Link
                            key={kind}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-4"
                          >
                            {label}
                          </Link>
                        ) : (
                          <span key={kind} className="text-muted-foreground">
                            {label}: {kind === "certificate" ? "not provided" : "—"}
                          </span>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.payment_status)}>{r.payment_status}</Badge>
                    {r.payment_status === "rejected" && r.payment_rejection_reason && (
                      <p className="text-muted-foreground mt-1 text-xs">{r.payment_rejection_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>{r.attended ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
              {(registrations?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground text-center">
                    No registrations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
