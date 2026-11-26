import { CoauthorFeeVerificationPanel } from "@/components/admin/coauthor-fee-verification-panel"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export default async function AdminCoauthorFeesPage() {
  await requireRole("admin")
  const admin = createAdminClient()

  const { data: conference } = await admin.from("conferences").select("id").eq("is_active", true).maybeSingle()

  const { data: fees } = conference
    ? await admin
        .from("coauthor_certificate_fees")
        .select("*")
        .eq("conference_id", conference.id)
        .order("submitted_at", { ascending: false })
    : { data: [] }

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
