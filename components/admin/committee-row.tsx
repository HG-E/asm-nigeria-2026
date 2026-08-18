"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { toggleCommitteeMemberActiveAction } from "@/app/admin/committee/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function CommitteeRow({ memberId, isActive }: { memberId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCommitteeMemberActiveAction(memberId, !isActive)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(isActive ? "Member deactivated" : "Member activated")
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>
      <Button type="button" variant="ghost" size="sm" onClick={handleToggle} disabled={isPending}>
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  )
}
