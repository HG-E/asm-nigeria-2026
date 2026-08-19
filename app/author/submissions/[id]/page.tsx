import Link from "next/link"
import { notFound } from "next/navigation"

import { PaymentStep } from "@/components/submission/payment-step"
import { RevisionForm } from "@/components/submission/revision-form"
import { Step1Form } from "@/components/submission/step1-form"
import { Step2Form } from "@/components/submission/step2-form"
import { Step3Form } from "@/components/submission/step3-form"
import { Step4Form } from "@/components/submission/step4-form"
import { Step5Upload } from "@/components/submission/step5-upload"
import { Step6Review } from "@/components/submission/step6-review"
import { WizardShell } from "@/components/submission/wizard-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAuth } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { createClient } from "@/lib/supabase/server"

import {
  submitAbstractAction,
  updateAuthorsAction,
  updateContentAction,
  updateDeclarationsAction,
  updateStep1Action,
} from "./actions"

export default async function SubmissionDetailPage(props: PageProps<"/author/submissions/[id]">) {
  const { id } = await props.params
  const searchParams = await props.searchParams
  const session = await requireAuth()
  const supabase = await createClient()

  const { data: submission } = await supabase
    .from("submissions")
    .select("*, conference_subthemes(name)")
    .eq("id", id)
    .eq("corresponding_author_id", session.authUserId)
    .maybeSingle()

  if (!submission) {
    notFound()
  }

  if (submission.status === "revision_required") {
    const conference = await getActiveConference()
    const nextVersion = submission.current_version + 1

    const [{ data: draftVersion }, { data: currentVersionRow }, { data: document }, { data: decision }] =
      await Promise.all([
        supabase
          .from("submission_versions")
          .select("abstract_text")
          .eq("submission_id", id)
          .eq("version_number", nextVersion)
          .maybeSingle(),
        supabase
          .from("submission_versions")
          .select("abstract_text")
          .eq("submission_id", id)
          .eq("version_number", submission.current_version)
          .maybeSingle(),
        supabase
          .from("submission_documents")
          .select("id, file_name, file_type, file_size_bytes, storage_path")
          .eq("submission_id", id)
          .eq("is_current", true)
          .maybeSingle(),
        supabase
          .from("decisions")
          .select("author_message, revision_deadline")
          .eq("submission_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    const defaultAbstractText = draftVersion?.abstract_text ?? currentVersionRow?.abstract_text ?? ""

    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{submission.title || "Untitled abstract"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Reference</dt>
            <dd>{submission.reference_number ?? "—"}</dd>
            <dt className="text-muted-foreground">Subtheme</dt>
            <dd>{submission.conference_subthemes?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">Revision required</dd>
          </dl>

          {(decision?.author_message || decision?.revision_deadline) && (
            <Alert>
              <AlertDescription className="space-y-1">
                {decision.revision_deadline && (
                  <p>
                    <strong>Revision deadline:</strong>{" "}
                    {new Date(decision.revision_deadline).toLocaleDateString()}
                  </p>
                )}
                {decision.author_message && <p>{decision.author_message}</p>}
              </AlertDescription>
            </Alert>
          )}

          <RevisionForm
            submissionId={id}
            userId={session.authUserId}
            wordLimit={conference?.abstract_word_limit ?? 300}
            defaultAbstractText={defaultAbstractText}
            currentDocument={document ?? null}
            allowedFileTypes={conference?.allowed_file_types ?? []}
            maxFileSizeMb={conference?.max_file_size_mb ?? 10}
          />

          <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (submission.status !== "draft") {
    const submitted = searchParams.submitted === "1"
    const paymentRejected = submission.payment_status === "rejected"
    const conference = paymentRejected ? await getActiveConference() : null

    const DECIDED_STATUSES = ["accepted", "accepted_oral", "accepted_poster", "rejected"]
    const { data: finalDecision } = DECIDED_STATUSES.includes(submission.status)
      ? await supabase
          .from("decisions")
          .select("decision, author_message")
          .eq("submission_id", id)
          .eq("is_final", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{submission.title || "Untitled abstract"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted && (
            <Alert>
              <AlertDescription>
                Submitted successfully. Your reference number is{" "}
                <strong>{submission.reference_number}</strong>. A confirmation email is on
                its way to your inbox.
              </AlertDescription>
            </Alert>
          )}
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Reference</dt>
            <dd>{submission.reference_number ?? "—"}</dd>
            <dt className="text-muted-foreground">Subtheme</dt>
            <dd>{submission.conference_subthemes?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{submission.status.replaceAll("_", " ")}</dd>
          </dl>

          {finalDecision?.author_message && (
            <Alert
              variant={
                finalDecision.decision === "rejected" ? "destructive" : "default"
              }
            >
              <AlertDescription>{finalDecision.author_message}</AlertDescription>
            </Alert>
          )}

          {paymentRejected && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  Your payment receipt was rejected
                  {submission.payment_rejection_reason
                    ? `: ${submission.payment_rejection_reason}`
                    : "."}{" "}
                  Please upload a corrected receipt below.
                </AlertDescription>
              </Alert>
              <PaymentStep
                submissionId={id}
                userId={session.authUserId}
                currentReceipt={null}
                defaultCurrency={submission.payment_currency as "NGN" | "USD" | null}
                feeNgn={conference?.submission_fee_ngn ?? null}
                feeUsd={conference?.submission_fee_usd ?? null}
                accountDetails={conference?.payment_account_details ?? null}
                backHref="/author/dashboard"
                nextHref="/author/dashboard"
              />
            </>
          )}

          <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    )
  }

  const conference = await getActiveConference()
  if (!conference) {
    notFound()
  }

  const step = Math.min(7, Math.max(1, Number(searchParams.step) || 1))
  const base = `/author/submissions/${id}`

  if (step === 1) {
    return (
      <WizardShell currentStep={1}>
        <Step1Form
          subthemes={conference.conference_subthemes}
          defaultValues={{
            title: submission.title,
            subthemeId: submission.subtheme_id ?? "",
            keywords: submission.keywords ?? [],
            presentationPreference: submission.presentation_preference,
          }}
          onSubmit={updateStep1Action.bind(null, id)}
        />
      </WizardShell>
    )
  }

  if (step === 2) {
    const { data: authors } = await supabase
      .from("submission_authors")
      .select("*")
      .eq("submission_id", id)
      .order("author_order", { ascending: true })

    const correspondingAuthor = authors?.find((a) => a.is_corresponding) ?? {
      first_name: session.profile.first_name,
      last_name: session.profile.last_name,
      institution: session.profile.institution ?? "",
      department: session.profile.department ?? null,
      country: session.profile.country ?? "",
      email: session.profile.email,
      orcid: session.profile.orcid,
    }
    const coAuthors = (authors ?? []).filter((a) => !a.is_corresponding)

    return (
      <WizardShell currentStep={2}>
        <Step2Form
          correspondingAuthor={correspondingAuthor}
          defaultValues={{
            coAuthors: coAuthors.map((a) => ({
              firstName: a.first_name,
              lastName: a.last_name,
              institution: a.institution ?? "",
              department: a.department ?? "",
              country: a.country ?? "",
              email: a.email ?? "",
              orcid: a.orcid ?? "",
            })),
          }}
          onSubmit={updateAuthorsAction.bind(null, id)}
          backHref={`${base}?step=1`}
        />
      </WizardShell>
    )
  }

  if (step === 3) {
    const { data: version } = await supabase
      .from("submission_versions")
      .select("abstract_text")
      .eq("submission_id", id)
      .eq("version_number", submission.current_version)
      .single()

    return (
      <WizardShell currentStep={3}>
        <Step3Form
          wordLimit={conference.abstract_word_limit}
          defaultValues={{ abstractText: version?.abstract_text ?? "" }}
          onSubmit={updateContentAction.bind(null, id)}
          backHref={`${base}?step=2`}
        />
      </WizardShell>
    )
  }

  if (step === 4) {
    return (
      <WizardShell currentStep={4}>
        <Step4Form
          defaultValues={{
            noConflictOfInterest: submission.no_conflict_of_interest || undefined,
            ethicalApprovalObtained: submission.ethical_approval_obtained || undefined,
            fundingDeclaration: submission.funding_declaration ?? "",
            originalityConfirmed: submission.originality_confirmed || undefined,
          }}
          onSubmit={updateDeclarationsAction.bind(null, id)}
          backHref={`${base}?step=3`}
        />
      </WizardShell>
    )
  }

  if (step === 5) {
    const { data: document } = await supabase
      .from("submission_documents")
      .select("id, file_name, file_type, file_size_bytes, storage_path")
      .eq("submission_id", id)
      .eq("is_current", true)
      .maybeSingle()

    return (
      <WizardShell currentStep={5}>
        <Step5Upload
          submissionId={id}
          userId={session.authUserId}
          currentDocument={document}
          allowedFileTypes={conference.allowed_file_types}
          maxFileSizeMb={conference.max_file_size_mb}
          backHref={`${base}?step=4`}
          nextHref={`${base}?step=6`}
        />
      </WizardShell>
    )
  }

  if (step === 6) {
    return (
      <WizardShell currentStep={6}>
        <PaymentStep
          submissionId={id}
          userId={session.authUserId}
          currentReceipt={
            submission.payment_receipt_path
              ? {
                  path: submission.payment_receipt_path,
                  uploadedAt: submission.payment_receipt_uploaded_at ?? "",
                }
              : null
          }
          defaultCurrency={submission.payment_currency as "NGN" | "USD" | null}
          feeNgn={conference.submission_fee_ngn}
          feeUsd={conference.submission_fee_usd}
          accountDetails={conference.payment_account_details}
          backHref={`${base}?step=5`}
          nextHref={`${base}?step=7`}
        />
      </WizardShell>
    )
  }

  // Step 7: Review & Submit
  const [{ data: authors }, { data: version }, { data: document }] = await Promise.all([
    supabase
      .from("submission_authors")
      .select("first_name, last_name, institution, country, is_corresponding")
      .eq("submission_id", id)
      .order("author_order", { ascending: true }),
    supabase
      .from("submission_versions")
      .select("abstract_text, word_count")
      .eq("submission_id", id)
      .eq("version_number", submission.current_version)
      .single(),
    supabase
      .from("submission_documents")
      .select("file_name")
      .eq("submission_id", id)
      .eq("is_current", true)
      .maybeSingle(),
  ])

  return (
    <WizardShell currentStep={7}>
      <Step6Review
        title={submission.title}
        subthemeName={submission.conference_subthemes?.name ?? "—"}
        keywords={submission.keywords ?? []}
        presentationPreference={submission.presentation_preference}
        authors={authors ?? []}
        abstractText={version?.abstract_text ?? ""}
        wordCount={version?.word_count ?? 0}
        declarations={{
          noConflictOfInterest: submission.no_conflict_of_interest,
          ethicalApprovalObtained: submission.ethical_approval_obtained,
          fundingDeclaration: submission.funding_declaration ?? "",
          originalityConfirmed: submission.originality_confirmed,
        }}
        documentFileName={document?.file_name ?? "No document uploaded"}
        paymentSummary={
          submission.payment_receipt_path
            ? `Receipt uploaded (paid in ${submission.payment_currency ?? "—"})`
            : "No payment receipt uploaded"
        }
        backHref={`${base}?step=6`}
        onSubmit={submitAbstractAction.bind(null, id)}
      />
    </WizardShell>
  )
}
