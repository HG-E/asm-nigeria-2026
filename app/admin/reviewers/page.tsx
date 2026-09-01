import { AddReviewerForm } from "@/components/admin/add-reviewer-form"
import { ReviewerRow } from "@/components/admin/reviewer-row"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createClient } from "@/lib/supabase/server"

export default async function AdminReviewersPage() {
  await requireRole("admin")
  const supabase = await createClient()
  const conference = await getActiveConference()

  const { data: reviewers } = await supabase
    .from("reviewer_profiles")
    .select("*, user_profiles(first_name, last_name, email, institution), conference_subthemes(name)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reviewers"
        description="Manage the scientific reviewers for ASM Nigeria 2026. Each reviewer is mapped to a subtheme for automatic submission routing."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add Reviewer</CardTitle>
        </CardHeader>
        <CardContent>
          <AddReviewerForm subthemes={conference?.conference_subthemes ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Reviewers ({reviewers?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {!reviewers || reviewers.length === 0 ? (
            <p className="text-muted-foreground px-6 text-sm sm:px-0">No reviewers added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-card sticky left-0 z-10 border-r">Reviewer</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Subtheme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewers.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="bg-card sticky left-0 z-10 border-r">
                      <div className="font-medium">
                        {r.user_profiles?.first_name} {r.user_profiles?.last_name}
                      </div>
                      <div className="text-muted-foreground text-xs">{r.user_profiles?.email}</div>
                    </TableCell>
                    <TableCell>{r.user_profiles?.institution ?? "—"}</TableCell>
                    <TableCell>{r.conference_subthemes?.name ?? "—"}</TableCell>
                    <TableCell colSpan={2}>
                      <ReviewerRow reviewerId={r.id} isActive={r.is_active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
