"use client"

import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type WorkloadAssignment = {
  id: string
  submissionId: string
  referenceNumber: string | null
  title: string | null
  status: string
  dueDate: string | null
  overdue: boolean
}

export function ReviewerWorkloadDialog({
  reviewerName,
  assignments,
}: {
  reviewerName: string
  assignments: WorkloadAssignment[]
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        View assignments ({assignments.length})
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{reviewerName}&apos;s assignments</DialogTitle>
        </DialogHeader>
        {assignments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active assignments.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {assignments.map((a) => (
              <li key={a.id} className="rounded-lg border p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/submissions/${a.submissionId}`}
                    className="min-w-0 truncate font-medium hover:underline"
                  >
                    {a.title || "Untitled"}
                  </Link>
                  <Badge
                    variant={
                      a.status === "completed"
                        ? "gold"
                        : a.status === "conflict"
                          ? "outline"
                          : a.overdue
                            ? "destructive"
                            : "secondary"
                    }
                    className="shrink-0"
                  >
                    {a.overdue ? "overdue" : a.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {a.referenceNumber ?? "—"}
                  {a.dueDate && (
                    <span> · Due {new Date(a.dueDate).toLocaleDateString()}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
