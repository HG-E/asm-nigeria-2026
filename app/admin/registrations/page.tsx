import Link from "next/link"

import { RegistrationVerificationPanel } from "@/components/admin/registration-verification-panel"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const STATUSES = ["pending", "verified", "rejected"] as const

function statusVariant(status: string): "gold" | "secondary" | "destructive" {
  if (status === "verified") return "gold"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export default async function AdminRegistrationsPage(props: PageProps<"/admin/registrations">) {
  await requireRole("admin")
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

  const receiptUrls = new Map<string, string>()
  for (const r of registrations ?? []) {
    if (r.payment_receipt_path) {
      const { data: signed } = await supabase.storage
        .from("registration-receipts")
        .createSignedUrl(r.payment_receipt_path, 60 * 10)
      if (signed?.signedUrl) receiptUrls.set(r.id, signed.signedUrl)
    }
  }

  const counts = {
    total: registrations?.length ?? 0,
    pending: registrations?.filter((r) => r.payment_status === "pending").length ?? 0,
    verified: registrations?.filter((r) => r.payment_status === "verified").length ?? 0,
    rejected: registrations?.filter((r) => r.payment_status === "rejected").length ?? 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conference Registrations</h1>
        <p className="text-muted-foreground text-sm">
          {counts.total} total · {counts.pending} pending · {counts.verified} verified · {counts.rejected} rejected
        </p>
      </div>

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
                <TableHead>Receipt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
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
                  </TableCell>
                  <TableCell className="text-sm">{r.amount_expected}</TableCell>
                  <TableCell>
                    {receiptUrls.has(r.id) ? (
                      <Link
                        href={receiptUrls.get(r.id)!}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm underline underline-offset-4"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.payment_status)}>{r.payment_status}</Badge>
                    {r.payment_status === "rejected" && r.payment_rejection_reason && (
                      <p className="text-muted-foreground mt-1 text-xs">{r.payment_rejection_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <RegistrationVerificationPanel
                      registrationId={r.id}
                      status={r.payment_status as "pending" | "verified" | "rejected"}
                    />
                  </TableCell>
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
