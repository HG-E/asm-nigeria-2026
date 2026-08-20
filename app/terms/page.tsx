import Link from "next/link"

import { Clause } from "@/components/policy/clause"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Terms & Declaration — ASM Nigeria 2026",
  description: "Terms, declarations, and fee policy for abstract submission and registration at the First ASM Nigeria Conference 2026.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <div className="min-h-svh px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-muted-foreground mb-6 text-sm">
          <Link href="/register" className="underline underline-offset-4">
            ← Back to registration
          </Link>
        </p>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Conference Terms &amp; Submission Declaration</CardTitle>
            <p className="text-muted-foreground text-sm">Last updated 20 August 2026</p>
            <p className="text-muted-foreground text-sm">
              These terms apply to anyone registering as an author and submitting an abstract
              to ASM Nigeria 2026 through this system. By checking the box at registration, an
              author agrees to the clauses below.
            </p>
          </CardHeader>
          <CardContent>
            <Clause number={1} title="Eligibility & account accuracy">
              <p>
                Registration requires a valid ASM membership ID and accurate professional
                details. You&apos;re responsible for keeping your name, institution, and
                contact information correct — reviewers, the committee, and the secretariat
                rely on it to reach you.
              </p>
            </Clause>
            <Clause number={2} title="Originality and authorship">
              <p>
                By submitting, the corresponding author confirms, on behalf of all listed
                authors, that the abstract is original work, has not been previously
                published, and that every listed co-author has agreed to be included and to
                the content submitted.
              </p>
            </Clause>
            <Clause number={3} title="Conflict of interest, ethics, and funding">
              <p>
                Each submission requires the author to declare any conflict of interest,
                confirm ethical approval where the study requires it, and disclose the source
                of funding or support. These declarations are taken at face value at
                submission and may be checked during review.
              </p>
            </Clause>
            <Clause number={4} title="Submission fee">
              <p>
                Each abstract requires a submission fee of ₦3,000 (or $5 USD equivalent),
                paid by bank transfer to the account shown during submission, with proof of
                payment uploaded at the same time. Submission proceeds immediately on upload;
                the secretariat verifies the receipt separately and will contact you if it
                cannot be confirmed.
              </p>
              <p>Fees are non-refundable once a submission has entered review.</p>
            </Clause>
            <Clause number={5} title="Review process">
              <p>
                Abstracts are reviewed double-blind by scientific reviewers assigned to the
                relevant subtheme. Reviewer recommendations are advisory; the Scientific
                Committee&apos;s decision is authoritative and is not bound to follow reviewer
                scores automatically.
              </p>
            </Clause>
            <Clause number={6} title="Revisions">
              <p>
                If the committee requests a revision, the author may resubmit a corrected
                version by the stated deadline. The original submission is preserved as prior
                version history. Submissions not revised by the deadline will be withdrawn
                from consideration.
              </p>
            </Clause>
            <Clause number={7} title="Acceptance and presentation">
              <p>
                An accepted abstract will be assigned a presentation format (oral or poster)
                by the committee, which may differ from the author&apos;s stated preference.
                Acceptance of an abstract is separate from conference registration and
                attendance, which is handled independently through its own registration form
                and fee. Registration fees, like submission fees, are non-refundable once paid.
              </p>
            </Clause>
            <Clause number={8} title="Publication">
              <p>
                Accepted abstracts may be published in the ASM Nigeria 2026 Book of Abstracts
                and associated conference materials, in the form submitted or as later
                revised. Submitting an abstract is consent to this use.
              </p>
            </Clause>
            <Clause number={9} title="Withdrawal">
              <p>
                You can withdraw a submitted abstract at any time before a final decision is
                made, using the &ldquo;Withdraw submission&rdquo; option on the submission&apos;s
                page in your dashboard. Withdrawal removes it from the review process and cannot
                be undone or resubmitted; the submission fee is not refunded. If you need help,
                contact the secretariat at{" "}
                <a href="mailto:asmnigeriaonehealth@gmail.com" className="underline underline-offset-4">
                  asmnigeriaonehealth@gmail.com
                </a>
                .
              </p>
            </Clause>
            <Clause number={10} title="Changes to these terms">
              <p>
                These terms may be updated as the conference approaches. Material changes will
                be reflected here with an updated date; continued use of the system after a
                change constitutes acceptance of it.
              </p>
            </Clause>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
