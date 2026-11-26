import Link from "next/link"

import { CoauthorFeeVerificationPanel } from "@/components/admin/coauthor-fee-verification-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { findAmbiguousAuthorEmails } from "@/lib/presentation-certificate"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminCoauthorFeesPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const { data: conference } = await admin.from("conferences").select("id").eq("is_active", true).maybeSingle()

  const [{ data: fees }, ambiguousGroups] = await Promise.all([
    conference
      ? admin
          .from("coauthor_certificate_fees")
          .select("*")
          .eq("conference_id", conference.id)
          .order("submitted_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    conference ? findAmbiguousAuthorEmails(conference.id) : Promise.resolve([]),
  ])

  // Pending first so the admin's attention lands on what actually needs a
  // decision, not buried below an already-settled history.
  const sorted = [...(fees ?? [])].sort((a, b) => {
    const rank = (s: string) => (s === "pending" ? 0 : s === "rejected" ? 1 : 2)
    return rank(a.payment_status) - rank(b.payment_status)
  })

  const receiptUrls = new Map<string, string>()
  await Promise.all(
    sorted
      .filter((f) => f.receipt_path)
      .map(async (f) => {
        const { data: signed } = await admin.storage
          .from("coauthor-fee-receipts")
          .createSignedUrl(f.receipt_path!, 60 * 10)
        if (signed?.signedUrl) receiptUrls.set(f.id, signed.signedUrl)
      })
  )

  const pendingCount = sorted.filter((f) => f.payment_status === "pending").length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Co-Author Certificate Fees"
        description={`One-time ₦5,000 fee each co-author pays to unlock their own Certificate of Presentation. ${pendingCount} pending review.`}
      />

      {ambiguousGroups.length > 0 && (
        <Card className="border-[#f5a800]/40 bg-[#fffaf0]">
          <CardHeader>
            <CardTitle className="text-base text-[#8a5a00]">
              {ambiguousGroups.length} abstract{ambiguousGroups.length === 1 ? "" : "s"} need{ambiguousGroups.length === 1 ? "s" : ""} author email cleanup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-[#8a5a00]">
              These abstracts have two or more different co-authors sharing one listed email -- each of them sees a
              &quot;which name is yours?&quot; screen when downloading their certificate until this is fixed.
              Correct each person&apos;s own email from the submission page.
            </p>
            <ul className="space-y-2">
              {ambiguousGroups.map((g) => (
                <li key={`${g.submissionId}-${g.email}`} className="rounded-md border border-[#f5a800]/30 bg-white p-3">
                  <Link href={`/admin/submissions/${g.submissionId}`} className="font-medium text-[#003087] underline underline-offset-2">
                    {g.referenceNumber}
                  </Link>
                  <p className="text-muted-foreground mt-1">{g.abstractTitle}</p>
                  <p className="mt-1">
                    <span className="text-muted-foreground">{g.email}</span> is shared by: {g.names.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No co-author fee submissions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((fee) => (
            <Card key={fee.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{fee.full_name}</p>
                    <p className="text-muted-foreground text-xs">{fee.email}</p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Submitted {new Date(fee.submitted_at).toLocaleString()}
                  </p>
                </div>
                <CoauthorFeeVerificationPanel
                  feeId={fee.id}
                  status={fee.payment_status as "pending" | "verified" | "rejected"}
                  receiptUrl={receiptUrls.get(fee.id) ?? null}
                  receiptFileName={fee.receipt_path?.split("/").pop() ?? null}
                  rejectionReason={fee.rejection_reason}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
