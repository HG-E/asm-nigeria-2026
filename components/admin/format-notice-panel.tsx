"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { sendFormatNoticeBatchAction } from "@/app/admin/notifications/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Target = {
  authorId: string
  email: string
  firstName: string
  alreadyNotified: boolean
  items: { reference: string; title: string; kind: "accepted" | "draft" | "revision" }[]
}

const KIND_LABEL = { accepted: "accepted", draft: "draft", revision: "revision requested" } as const

export function FormatNoticePanel({
  targets,
  pending,
  notifiedCount,
}: {
  targets: Target[]
  pending: number
  notifiedCount: number
}) {
  const router = useRouter()
  const [running, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)

  const unsent = targets.filter((t) => !t.alreadyNotified).length
  const itemCount = targets.reduce((sum, t) => sum + t.items.length, 0)

  function run(remind: boolean, expected: number) {
    const what = remind ? "a reminder to" : "the notice to"
    if (!window.confirm(`Send ${what} ${expected} author${expected === 1 ? "" : "s"} now? This emails real people.`)) return
    startTransition(async () => {
      let sent = 0
      // Keep asking for the next small batch until none are left.
      for (let guard = 0; guard < 60; guard++) {
        const result = await sendFormatNoticeBatchAction(remind)
        if ("error" in result) {
          toast.error(result.error)
          setProgress(null)
          router.refresh()
          return
        }
        sent += result.sentThisBatch
        setProgress(`Sent ${sent}... ${result.remaining} to go`)
        if (result.remaining <= 0) break
      }
      setProgress(null)
      toast.success(`Done -- ${sent} email${sent === 1 ? "" : "s"} processed. Check the log below for any failures.`)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Abstract-format notice</CardTitle>
        <CardDescription>
          Asks authors whose abstract predates the four-part structure to rewrite it: accepted abstracts (for the Book
          of Abstracts), drafts, and abstracts under revision. One email per author, covering everything outstanding
          for them. Recalculated live -- anyone who has already fixed theirs drops out automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {targets.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing outstanding: every affected abstract is already in the four-part format.</p>
        ) : (
          <>
            <p className="text-sm">
              <strong>{targets.length}</strong> author{targets.length === 1 ? "" : "s"} with <strong>{itemCount}</strong>{" "}
              abstract{itemCount === 1 ? "" : "s"} outstanding &middot; {notifiedCount} already notified &middot;{" "}
              {pending} queued
            </p>
            <details className="rounded-md border p-3 text-sm">
              <summary className="cursor-pointer font-medium">See exactly who would be emailed</summary>
              <ul className="mt-3 space-y-2">
                {targets.map((t) => (
                  <li key={t.authorId}>
                    <span className="font-medium">{t.firstName || t.email}</span>{" "}
                    <span className="text-muted-foreground text-xs">{t.email}</span>
                    {t.alreadyNotified && <span className="text-muted-foreground text-xs"> &middot; already notified</span>}
                    <div className="text-muted-foreground text-xs">
                      {t.items.map((i) => `${i.reference} (${KIND_LABEL[i.kind]})`).join(", ")}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => run(false, unsent)} disabled={running || unsent === 0}>
                {running ? "Sending..." : `Send notice to ${unsent} author${unsent === 1 ? "" : "s"}`}
              </Button>
              {notifiedCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => run(true, notifiedCount)}
                  disabled={running}
                >
                  Send reminder (only those notified over 7 days ago)
                </Button>
              )}
              {progress && <span className="text-muted-foreground text-sm">{progress}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
