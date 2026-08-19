"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { assignReviewerAction, removeAssignmentAction } from "@/app/admin/submissions/[id]/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Assignment = {
  id: string
  status: string
  reviewerId: string
  reviewerName: string
}

type Reviewer = { id: string; name: string }

export function ReviewerAssignmentPanel({
  submissionId,
  assignments,
  availableReviewers,
}: {
  submissionId: string
  assignments: Assignment[]
  availableReviewers: Reviewer[]
}) {
  const [selected, setSelected] = useState("")
  const [isPending, startTransition] = useTransition()

  const assignedIds = new Set(assignments.map((a) => a.reviewerId))
  const options = availableReviewers.filter((r) => !assignedIds.has(r.id))

  function handleAssign() {
    if (!selected) return
    startTransition(async () => {
      const result = await assignReviewerAction(submissionId, selected)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Reviewer assigned")
      setSelected("")
    })
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      const result = await removeAssignmentAction(submissionId, assignmentId)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success("Assignment removed")
    })
  }

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Not yet assigned to a reviewer.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span>
                {a.reviewerName} — <Badge variant="secondary">{a.status.replaceAll("_", " ")}</Badge>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(a.id)}
                disabled={isPending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      {options.length > 0 && (
        <div className="flex gap-2">
          <Select value={selected} onValueChange={(value) => setSelected(value ?? "")}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a reviewer to assign" />
            </SelectTrigger>
            <SelectContent>
              {options.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" onClick={handleAssign} disabled={!selected || isPending}>
            Assign
          </Button>
        </div>
      )}
    </div>
  )
}
