import Link from "next/link"

import { Clause } from "@/components/policy/clause"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Privacy & Data-Use Policy — ASM Nigeria 2026",
}

export default function PrivacyPage() {
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
            <CardTitle className="text-2xl">Privacy &amp; Data-Use Policy</CardTitle>
            <p className="text-muted-foreground text-sm">Last updated 19 August 2026</p>
            <p className="text-muted-foreground text-sm">
              This describes what personal data the Abstract Management System collects from
              authors, reviewers, and committee members, and how it&apos;s used.
            </p>
          </CardHeader>
          <CardContent>
            <Clause number={1} title="What we collect">
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Account details: name, ASM ID number, email, professional title,
                  institution, department, country, phone number, and ORCID if provided.
                </li>
                <li>
                  Submission content: abstract title, subtheme, keywords, full abstract text,
                  co-author details, and the uploaded abstract document.
                </li>
                <li>
                  Payment information: the currency you paid in and a receipt or screenshot of
                  your bank transfer, uploaded for verification.
                </li>
                <li>Review activity: scores, recommendations, and comments, for reviewer accounts.</li>
                <li>
                  Contact form messages: the name, email, subject, and message you provide, and
                  the IP address your message was sent from (used only to prevent spam and abuse
                  of the form).
                </li>
              </ul>
            </Clause>
            <Clause number={2} title="How we use it">
              <p>
                To route your abstract to the right reviewers, communicate submission and
                decision status, verify payment, compile the Book of Abstracts, respond to
                enquiries submitted through the contact form (including an automatic
                acknowledgement email), and keep an audit record of conference decisions. We
                don&apos;t use your information for anything beyond running this conference.
              </p>
            </Clause>
            <Clause number={3} title="Who can see what">
              <p>Access is limited by role, not open by default:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <strong className="text-foreground">Reviewers</strong> see your
                  abstract&apos;s content and subtheme only — never your name, institution, or
                  contact details, to keep review double-blind.
                </li>
                <li>
                  <strong className="text-foreground">Committee members</strong> see full
                  submission details, including author identity, to make a final decision.
                </li>
                <li>
                  <strong className="text-foreground">Payment receipts</strong> are visible
                  only to you and the administrator who verifies them — never to reviewers or
                  the committee.
                </li>
                <li>
                  <strong className="text-foreground">Administrators</strong> have full
                  access, needed to run the conference and support authors and reviewers
                  directly, including contact form messages.
                </li>
              </ul>
            </Clause>
            <Clause number={4} title="Where it's stored">
              <p>
                Data is stored with Supabase (database and file storage) and the application
                is hosted on Vercel. Uploaded files, including payment receipts, are kept in
                private storage that isn&apos;t publicly accessible. Emails are sent through a
                standard transactional email service and used only for conference-related
                notifications — never marketing.
              </p>
            </Clause>
            <Clause number={5} title="How long we keep it">
              <p>
                Submission and account data is retained for 1 to 2 years after the conference
                concludes, for record-keeping and to support future editions of the
                conference, after which it may be deleted or anonymized on request.
              </p>
            </Clause>
            <Clause number={6} title="Your rights">
              <p>
                You can review and correct most of your own details from your Profile page at
                any time. To request a copy of your data, a correction we can&apos;t make
                ourselves, or deletion of your account, contact{" "}
                <a href="mailto:asmnigeriaonehealth@gmail.com" className="underline underline-offset-4">
                  asmnigeriaonehealth@gmail.com
                </a>
                .
              </p>
            </Clause>
            <Clause number={7} title="Legal basis">
              <p>
                We process your data on the basis of your consent at registration and our
                legitimate interest in running the conference&apos;s review process,
                consistent with the Nigeria Data Protection Act 2023.
              </p>
            </Clause>
            <Clause number={8} title="Third parties">
              <p>
                We don&apos;t sell or share your data with unrelated third parties. Supabase
                and our hosting/email providers act only as infrastructure for us and
                don&apos;t use your data independently.
              </p>
            </Clause>
            <Clause number={9} title="Changes to this policy">
              <p>
                If this policy changes materially, we&apos;ll update the date above and, where
                appropriate, notify registered users by email.
              </p>
            </Clause>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
