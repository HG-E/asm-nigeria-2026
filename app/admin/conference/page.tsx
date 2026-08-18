import { updateConferenceAction } from "./actions"
import { ConferenceSettingsForm } from "@/components/admin/conference-settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

function toDateTimeLocal(iso: string | null) {
  return iso ? iso.slice(0, 16) : ""
}

export default async function AdminConferencePage() {
  await requireRole("admin")
  const supabase = await createClient()

  const { data: conference } = await supabase
    .from("conferences")
    .select("*")
    .eq("is_active", true)
    .single()

  if (!conference) {
    return <p className="text-muted-foreground">No active conference is configured.</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conference Settings</h1>
        <p className="text-muted-foreground text-sm">
          These settings apply conference-wide, including the abstract word limit and
          file rules enforced during submission.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{conference.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ConferenceSettingsForm
            defaultValues={{
              name: conference.name,
              theme: conference.theme ?? "",
              tagline: conference.tagline ?? "",
              location: conference.location,
              venue: conference.venue ?? "",
              startDate: conference.start_date ?? "",
              endDate: conference.end_date ?? "",
              earlySubmissionDeadline: toDateTimeLocal(conference.early_submission_deadline),
              lateSubmissionDeadline: toDateTimeLocal(conference.late_submission_deadline),
              reviewDeadline: toDateTimeLocal(conference.review_deadline),
              decisionDate: conference.decision_date ?? "",
              abstractWordLimit: conference.abstract_word_limit,
              maxFileSizeMb: conference.max_file_size_mb,
              secretariatEmail: conference.secretariat_email ?? "",
              website: conference.website ?? "",
              submissionsOpen: conference.submissions_open,
            }}
            onSave={updateConferenceAction.bind(null, conference.id)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
