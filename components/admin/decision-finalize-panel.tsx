"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { finalizeDecisionAction } from "@/app/admin/submissions/[id]/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Decision = {
  id: string
  decision: string
  decisionNotes: string | null
  authorMessage: string | null
  revisionDeadline: string | null
  isFinal: boolean
}

export function DecisionFinalizePanel({
  submissionId,
  decision,
}: {
  submissionId: string
  decision: Decision | null
}) {
  const [isPending, startTransition] = useTransition()

  if (!decision) {
    return (
      <p className="text-muted-foreground text-sm">
        No decision has been proposed by the committee yet.
      </p>
    )
  }

  function handleFinalize() {
    if (!decision) return
    startTransition(async () => {
      const result = await finalizeDecisionAction(submissionId, decision.id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Decision finalized — author notified.")
    })
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={decision.isFinal ? "default" : "secondary"}>
          {decision.decision.replaceAll("_", " ")}
        </Badge>
        <Badge variant="outline">{decision.isFinal ? "Final" : "Pending sign-off"}</Badge>
      </div>
      {decision.decisionNotes && (
        <p>
          <span className="text-muted-foreground">Committee notes: </span>
          {decision.decisionNotes}
        </p>
      )}
      {decision.authorMessage && (
        <p>
          <span className="text-muted-foreground">Message to author: </span>
          {decision.authorMessage}
        </p>
      )}
      {decision.revisionDeadline && (
        <p>
          <span className="text-muted-foreground">Revision deadline: </span>
          {new Date(decision.revisionDeadline).toLocaleDateString()}
        </p>
      )}
      {!decision.isFinal && (
        <Button type="button" onClick={handleFinalize} disabled={isPending}>
          {isPending ? "Finalizing..." : "Finalize & Notify Author"}
        </Button>
      )}
    </div>
  )
}
