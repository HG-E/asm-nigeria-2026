// Server-side guards of the formatting-only edit (lib/abstract-formatting.ts),
// exercised directly against a disposable submission that
// scripts/wizard-e2e-test.mjs creates and cleans up. Prints one JSON line:
// [[name, passed], ...]. Restores the submission's status when done.
//
//   NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env.local \
//     scripts/formatting-server-check.ts <submissionId> <authorId>
import { applyFormattingOnly } from "@/lib/abstract-formatting"
import { createAdminClient } from "@/lib/supabase/admin"

const [submissionId, authorId] = process.argv.slice(2)

async function main() {
  const admin = createAdminClient()
  const results: [string, boolean][] = []
  const check = (name: string, ok: boolean) => results.push([name, Boolean(ok)])

  const { data: cur } = await admin
    .from("submissions")
    .select("title, keywords, status, current_version")
    .eq("id", submissionId)
    .single()
  const originalStatus = cur!.status
  const T = cur!.title
  const K = cur!.keywords ?? []
  const version = async () =>
    (
      await admin
        .from("submission_versions")
        .select("abstract_background, abstract_methods, abstract_results, abstract_conclusion")
        .eq("submission_id", submissionId)
        .eq("version_number", cur!.current_version)
        .single()
    ).data!
  const v0 = await version()
  const sections = {
    background: v0.abstract_background!,
    methods: v0.abstract_methods!,
    results: v0.abstract_results!,
    conclusion: v0.abstract_conclusion!,
  }
  const author = { id: authorId, email: null, role: "author" as const }
  const setStatus = (status: string) =>
    admin.from("submissions").update({ status: status as never }).eq("id", submissionId)

  try {
    let r = await applyFormattingOnly(submissionId, { title: `${T} extra`, keywords: K, sections }, author)
    check("changing a title word is rejected", "error" in r && /title/i.test(r.error))

    r = await applyFormattingOnly(submissionId, { title: `${T}<script>alert(1)</script>`, keywords: K, sections }, author)
    check("injecting markup into the title is rejected (words differ)", "error" in r)

    r = await applyFormattingOnly(
      submissionId,
      { title: T, keywords: K, sections },
      { id: "00000000-0000-0000-0000-000000000000", email: null, role: "author" }
    )
    check("someone else's submission is refused", "error" in r && /could not be found/.test(r.error))

    r = await applyFormattingOnly(
      submissionId,
      { title: T, keywords: K, sections: { ...sections, background: `${sections.background} added` } },
      author
    )
    check("changing a section word is rejected, naming the section", "error" in r && /Background/.test(r.error))

    r = await applyFormattingOnly(submissionId, { title: T, keywords: [...K].reverse(), sections }, author)
    check("reordering keywords is rejected", K.length < 2 || "error" in r)

    r = await applyFormattingOnly(submissionId, { title: T, keywords: [...K, "extra"], sections }, author)
    check("adding a keyword is rejected", "error" in r)

    // A real formatting-only change goes through.
    r = await applyFormattingOnly(submissionId, { title: `<u>${T}</u>`, keywords: K, sections }, author)
    check("formatting-only change succeeds", "success" in r && r.changed === true)
    const after = (await admin.from("submissions").select("title, title_plain").eq("id", submissionId).single()).data!
    check("stored title carries the underline", after.title.includes("<u>"))
    check("title_plain (search copy) has no tags", !/<\/?u>/.test(after.title_plain ?? ""))

    r = await applyFormattingOnly(submissionId, { title: `<u>${T}</u>`, keywords: K, sections }, author)
    check("repeating it is a no-op", "success" in r && r.changed === false)

    const { data: audit } = await admin
      .from("audit_logs")
      .select("metadata")
      .eq("entity_id", submissionId)
      .eq("action", "abstract_formatting_updated")
    check(
      "audit entry keeps the previous formatting",
      (audit ?? []).some((a) => JSON.stringify(a.metadata).includes("previous"))
    )

    // Admin acting for the author.
    r = await applyFormattingOnly(submissionId, { title: T, keywords: K, sections }, { id: authorId, email: null, role: "admin" })
    check("admin can fix formatting for an author (and revert)", "success" in r)

    // Statuses where formatting is closed.
    await setStatus("rejected")
    r = await applyFormattingOnly(submissionId, { title: `<b>${T}</b>`, keywords: K, sections }, author)
    check("rejected submission is closed to formatting", "error" in r)
    await setStatus("draft")
    r = await applyFormattingOnly(submissionId, { title: `<b>${T}</b>`, keywords: K, sections }, author)
    check("draft is edited in the wizard, not here", "error" in r)

    // Open revision: title/keywords only; the abstract is edited in the revision form.
    await setStatus("revision_required")
    r = await applyFormattingOnly(
      submissionId,
      { title: T, keywords: K, sections: { ...sections, background: `<i>${sections.background}</i>` } },
      author
    )
    const v1 = await version()
    check(
      "during a revision the abstract sections are left alone",
      "success" in r && r.changed === false && v1.abstract_background === sections.background
    )
  } finally {
    await setStatus(originalStatus)
  }
  console.log("RESULTS " + JSON.stringify(results))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
