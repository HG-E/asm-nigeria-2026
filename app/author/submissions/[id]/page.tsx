import Link from "next/link"
import { notFound } from "next/navigation"

import { WithdrawSubmissionPanel } from "@/components/author/withdraw-submission-panel"
import { PaymentStep } from "@/components/submission/payment-step"
import { RestructureAbstractForm } from "@/components/submission/restructure-abstract-form"
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
import {
  BOOK_RESTRUCTURE_DEADLINE_LABEL,
  isStructured,
  sectionsFromVersion,
} from "@/lib/abstract-structure"
import { requireAuth } from "@/lib/auth"
import { getActiveConference } from "@/lib/conference"
import { STATUS_HINTS } from "@/lib/submission-status"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { WITHDRAWABLE_STATUSES } from "@/lib/validations/submission"

import {
  submitAbstractAction,
  updateAuthorsAction,
  updateContentAction,
  updateDeclarationsAction,
  updateStep1Action,
} from "./actions"

const VERSION_TEXT_COLUMNS =
  "abstract_text, abstract_background, abstract_methods, abstract_results, abstract_conclusion"

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
          .select(VERSION_TEXT_COLUMNS)
          .eq("submission_id", id)
          .eq("version_number", nextVersion)
          .maybeSingle(),
        supabase
          .from("submission_versions")
          .select(VERSION_TEXT_COLUMNS)
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
          .select("author_message, revision_deadline, attachment_path, attachment_file_name")
          .eq("submission_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    const draftIsStructured = draftVersion ? isStructured(draftVersion) : false
    const defaultSections = sectionsFromVersion(draftIsStructured ? draftVersion : null)
    // Older abstracts are free text; show the current one for reference while
    // the author rewrites it into the four parts.
    const legacyText = draftIsStructured
      ? undefined
      : draftVersion?.abstract_text || currentVersionRow?.abstract_text || undefined

    let decisionAttachmentUrl: string | null = null
    if (decision?.attachment_path) {
      const { data: signed } = await createAdminClient()
        .storage.from("decision-attachments")
        .createSignedUrl(decision.attachment_path, 60 * 10)
      decisionAttachmentUrl = signed?.signedUrl ?? null
    }

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

          {(decision?.author_message || decision?.revision_deadline || decision?.attachment_path) && (
            <Alert>
              <AlertDescription className="space-y-1">
                {decision.revision_deadline && (
                  <p>
                    <strong>Revision deadline:</strong>{" "}
                    {new Date(decision.revision_deadline).toLocaleDateString()}
                  </p>
                )}
                {decision.author_message && <p>{decision.author_message}</p>}
                {decision.attachment_path && decisionAttachmentUrl && (
                  <p>
                    <Link
                      href={decisionAttachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Download reviewer&apos;s corrected file
                      {decision.attachment_file_name ? ` (${decision.attachment_file_name})` : ""}
                    </Link>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <RevisionForm
            submissionId={id}
            userId={session.authUserId}
            defaultSections={defaultSections}
            legacyText={legacyText}
            currentDocument={document ?? null}
            allowedFileTypes={conference?.allowed_file_types ?? []}
            maxFileSizeMb={conference?.max_file_size_mb ?? 10}
          />

          <div className="space-y-3">
            <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
              Back to dashboard
            </Link>
            <WithdrawSubmissionPanel submissionId={id} />
          </div>
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
          .select("decision, author_message, attachment_path, attachment_file_name")
          .eq("submission_id", id)
          .eq("is_final", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null }

    const isAccepted = ["accepted", "accepted_oral", "accepted_poster"].includes(submission.status)
    const { data: acceptedVersion } = isAccepted
      ? await supabase
          .from("submission_versions")
          .select(VERSION_TEXT_COLUMNS)
          .eq("submission_id", id)
          .eq("version_number", submission.current_version)
          .maybeSingle()
      : { data: null }
    const acceptedStructured = acceptedVersion ? isStructured(acceptedVersion) : false

    let finalAttachmentUrl: string | null = null
    if (finalDecision?.attachment_path) {
      const { data: signed } = await createAdminClient()
        .storage.from("decision-attachments")
        .createSignedUrl(finalDecision.attachment_path, 60 * 10)
      finalAttachmentUrl = signed?.signedUrl ?? null
    }

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
            <dd className="capitalize">
              {submission.status.replaceAll("_", " ")}
              {STATUS_HINTS[submission.status] && (
                <span className="text-muted-foreground block text-xs normal-case">
                  {STATUS_HINTS[submission.status]}
                </span>
              )}
            </dd>
          </dl>

          {(finalDecision?.author_message || finalDecision?.attachment_path) && (
            <Alert
              variant={
                finalDecision.decision === "rejected" ? "destructive" : "default"
              }
            >
              <AlertDescription className="space-y-1">
                {finalDecision.author_message && <p>{finalDecision.author_message}</p>}
                {finalDecision.attachment_path && finalAttachmentUrl && (
                  <p>
                    <Link
                      href={finalAttachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Download reviewer&apos;s corrected file
                      {finalDecision.attachment_file_name ? ` (${finalDecision.attachment_file_name})` : ""}
                    </Link>
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isAccepted && acceptedVersion && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Your abstract for the Book of Abstracts</h3>
              <Alert variant={acceptedStructured ? "default" : "destructive"}>
                <AlertDescription>
                  {acceptedStructured
                    ? "Your abstract is in the four-part format and ready for the Book of Abstracts. You can still refine the wording until "
                    : "The Book of Abstracts prints every abstract in four labelled parts (Background, Methods, Results, Conclusion). Please rewrite yours into that format by "}
                  <strong>{BOOK_RESTRUCTURE_DEADLINE_LABEL}</strong>.
                </AlertDescription>
              </Alert>
              <RestructureAbstractForm
                submissionId={id}
                alreadyStructured={acceptedStructured}
                defaultSections={sectionsFromVersion(acceptedStructured ? acceptedVersion : null)}
                legacyText={acceptedStructured ? undefined : acceptedVersion.abstract_text?.trim() || undefined}
              />
            </div>
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

          <div className="space-y-3">
            <Link href="/author/dashboard" className={buttonVariants({ variant: "outline" })}>
              Back to dashboard
            </Link>
            {(WITHDRAWABLE_STATUSES as readonly string[]).includes(submission.status) && (
              <WithdrawSubmissionPanel submissionId={id} />
            )}
          </div>
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
      .select(VERSION_TEXT_COLUMNS)
      .eq("submission_id", id)
      .eq("version_number", submission.current_version)
      .single()

    const structured = version ? isStructured(version) : false

    return (
      <WizardShell currentStep={3}>
        <Step3Form
          defaultValues={sectionsFromVersion(structured ? version : null)}
          legacyText={structured ? undefined : version?.abstract_text?.trim() || undefined}
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
      .select(`${VERSION_TEXT_COLUMNS}, word_count`)
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
        abstractVersion={version}
        wordCount={version?.word_count ?? 0}
        abstractEditHref={`${base}?step=3`}
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
