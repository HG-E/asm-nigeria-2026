import { redirect } from "next/navigation"

import { Step1Form } from "@/components/submission/step1-form"
import { WizardShell } from "@/components/submission/wizard-shell"
import { requireAuth } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"

import { createDraftAction } from "./actions"

export default async function NewSubmissionPage() {
  await requireAuth()
  const conference = await getActiveConference()

  if (!conference) {
    redirect("/author/dashboard")
  }

  return (
    <WizardShell currentStep={1}>
      <Step1Form
        subthemes={conference.conference_subthemes}
        defaultValues={{
          title: "",
          subthemeId: "",
          keywords: [],
          presentationPreference: "either",
        }}
        onSubmit={createDraftAction}
      />
    </WizardShell>
  )
}
